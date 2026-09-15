-- Correctif pour un projet où 0001_init.sql a déjà été exécuté (avant que ce correctif y soit
-- intégré). Colle uniquement ce fichier dans le SQL Editor — inutile de rejouer 0001 en entier.
--
-- Constat : Supabase active Row Level Security par défaut sur toute nouvelle table, même sans
-- `enable row level security` explicite — la table `keepalive`, volontairement laissée sans
-- policy, se retrouvait donc bloquée pour tout le monde y compris la clé "anon". Comme son
-- contenu n'est ni sensible ni lié à un utilisateur (un horodatage technique), on ajoute une
-- policy volontairement permissive plutôt que de lutter contre ce défaut de la plateforme.

alter table public.keepalive enable row level security;

create policy "keepalive_public_rw" on public.keepalive for all using (true) with check (true);
