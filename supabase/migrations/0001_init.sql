-- YourFin — schéma initial du compte synchronisé (optionnel, le local reste le défaut gratuit).
-- À coller dans Supabase → SQL Editor → New query, ou via `supabase db push` si tu utilises la CLI.
--
-- Principes (voir la note "YourFin Privacy Architecture" pour le détail) :
--   - Compte simple, données minimales : rien n'est demandé au-delà de l'e-mail pour se connecter.
--   - Chaque table métier est cloisonnée par utilisateur via Row Level Security (RLS), activée
--     dès la création — jamais ajoutée après coup.
--   - Montants en centimes entiers (colonnes *_cents), jamais de numeric/float pour l'argent.
--   - Les id restent des `text` (mêmes identifiants générés côté client qu'en local, pour que la
--     synchronisation avec IndexedDB n'ait pas besoin de remapper les clés).

-- ------------------------------------------------------------------ Profil (1 ligne par utilisateur)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  onboarding_done boolean not null default false,
  pro boolean not null default false,
  pro_since timestamptz,
  -- Profil fiscal (module 3a/impôts) : toujours optionnel, jamais requis pour utiliser le compte.
  canton text not null default 'VD',
  birth_year integer,
  taxable_income_cents integer,
  monthly_net_income_cents integer,
  has_pension_fund boolean not null default true,
  marital_status text not null default 'single' check (marital_status in ('single', 'married')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
-- Pas de policy insert : la ligne est créée automatiquement par le trigger ci-dessous, jamais par le client.

-- Crée automatiquement le profil à l'inscription (l'utilisateur n'a jamais de formulaire "créer mon profil").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ Comptes

create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'cash', 'card', 'investment', 'pillar3a')),
  currency text not null default 'CHF',
  initial_balance_cents integer not null default 0,
  color text not null,
  archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
create policy "accounts_all_own" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ Catégories
-- user_id nul = catégorie système, visible par tout le monde mais non modifiable côté client.

create table if not exists public.categories (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  group_name text not null check (group_name in ('needs', 'wants', 'savings', 'income')),
  icon text not null,
  color text not null,
  color_dark text not null,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  archived boolean not null default false
);

alter table public.categories enable row level security;
create policy "categories_select_system_or_own" on public.categories for select using (user_id is null or auth.uid() = user_id);
create policy "categories_write_own_non_system" on public.categories for insert with check (auth.uid() = user_id and is_system = false);
create policy "categories_update_own_non_system" on public.categories for update using (auth.uid() = user_id and is_system = false);
create policy "categories_delete_own_non_system" on public.categories for delete using (auth.uid() = user_id and is_system = false);

-- ------------------------------------------------------------------ Transactions

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount_cents integer not null check (amount_cents >= 0),
  date date not null,
  month text not null, -- "YYYY-MM", dénormalisé pour des requêtes rapides par mois
  account_id text not null references public.accounts(id) on delete cascade,
  to_account_id text references public.accounts(id) on delete set null,
  category_id text references public.categories(id) on delete set null,
  payee text not null default '',
  note text,
  recurring_id text,
  goal_id text,
  import_hash text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'recurring', 'goal', 'seed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "transactions_all_own" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists transactions_user_month_idx on public.transactions (user_id, month);
create index if not exists transactions_user_import_hash_idx on public.transactions (user_id, import_hash);

-- ------------------------------------------------------------------ Budgets

create table if not exists public.budgets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  month text not null,
  amount_cents integer not null check (amount_cents >= 0),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;
create policy "budgets_all_own" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ Récurrences

create table if not exists public.recurring (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount_cents integer not null check (amount_cents >= 0),
  category_id text references public.categories(id) on delete set null,
  account_id text not null references public.accounts(id) on delete cascade,
  payee text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring enable row level security;
create policy "recurring_all_own" on public.recurring for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ Objectifs d'épargne

create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  target_amount_cents integer not null check (target_amount_cents > 0),
  saved_amount_cents integer not null default 0,
  deadline date,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;
create policy "goals_all_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ Règles de catégorisation apprises

create table if not exists public.rules (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null,
  category_id text not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, pattern)
);

alter table public.rules enable row level security;
create policy "rules_all_own" on public.rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------------ Catégories système (seed)
-- Mêmes 22 catégories que la version locale (src/lib/domain/categories.ts) — user_id null = partagées.

insert into public.categories (id, user_id, name, kind, group_name, icon, color, color_dark, sort_order, is_system) values
  ('housing', null, 'Logement', 'expense', 'needs', 'Home', '#4a3aa7', '#9085e9', 0, true),
  ('groceries', null, 'Courses', 'expense', 'needs', 'ShoppingCart', '#1baf7a', '#199e70', 1, true),
  ('restaurants', null, 'Restaurants & bars', 'expense', 'wants', 'UtensilsCrossed', '#eb6834', '#d95926', 2, true),
  ('transport', null, 'Transport', 'expense', 'needs', 'TrainFront', '#2a78d6', '#3987e5', 3, true),
  ('health', null, 'Santé & assurances', 'expense', 'needs', 'HeartPulse', '#e87ba4', '#d55181', 4, true),
  ('subscriptions', null, 'Abonnements & télécom', 'expense', 'wants', 'Smartphone', '#eda100', '#c98500', 5, true),
  ('shopping', null, 'Shopping', 'expense', 'wants', 'ShoppingBag', '#8e3b8e', '#c06ac0', 6, true),
  ('leisure', null, 'Loisirs & sorties', 'expense', 'wants', 'Ticket', '#008300', '#3ea33e', 7, true),
  ('travel', null, 'Voyages', 'expense', 'wants', 'Plane', '#0e8f9e', '#22a5b5', 8, true),
  ('education', null, 'Formation', 'expense', 'needs', 'GraduationCap', '#a0522d', '#c4744f', 9, true),
  ('gifts', null, 'Cadeaux & dons', 'expense', 'wants', 'Gift', '#e34948', '#e66767', 10, true),
  ('kids', null, 'Enfants & famille', 'expense', 'needs', 'Baby', '#c2410c', '#f0834a', 11, true),
  ('taxes', null, 'Impôts', 'expense', 'needs', 'Landmark', '#5a6478', '#8b96ad', 12, true),
  ('fees', null, 'Frais bancaires', 'expense', 'needs', 'Receipt', '#7c7c90', '#9c9cb0', 13, true),
  ('cash', null, 'Retraits cash', 'expense', 'wants', 'Banknote', '#6b8e23', '#7fae2a', 14, true),
  ('savings', null, 'Épargne & investissement', 'expense', 'savings', 'PiggyBank', '#5b4cff', '#7c6cff', 15, true),
  ('other', null, 'Autres', 'expense', 'wants', 'MoreHorizontal', '#9c9cb0', '#6f6f85', 16, true),
  ('salary', null, 'Salaire', 'income', 'income', 'Briefcase', '#008300', '#3ea33e', 17, true),
  ('bonus', null, 'Primes & bonus', 'income', 'income', 'Sparkles', '#1baf7a', '#199e70', 18, true),
  ('refund', null, 'Remboursements', 'income', 'income', 'Undo2', '#2a78d6', '#3987e5', 19, true),
  ('side_income', null, 'Revenus annexes', 'income', 'income', 'Coins', '#eda100', '#c98500', 20, true),
  ('other_income', null, 'Autres revenus', 'income', 'income', 'CircleDollarSign', '#5a6478', '#8b96ad', 21, true)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ Table de "ping" pour le keep-alive
-- Une seule ligne, mise à jour périodiquement par le workflow GitHub Actions pour éviter la mise en
-- pause du projet gratuit après 7 jours d'inactivité. Aucune donnée utilisateur ici.

create table if not exists public.keepalive (
  id integer primary key default 1,
  pinged_at timestamptz not null default now(),
  constraint keepalive_singleton check (id = 1)
);
insert into public.keepalive (id) values (1) on conflict (id) do nothing;
-- Pas de RLS ici volontairement : ni sensible ni lié à un utilisateur, juste un compteur technique.
