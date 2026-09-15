"use client";

import { getSupabaseClient } from "./client";

/**
 * Connexion par lien magique (e-mail) : pas de mot de passe à créer ni à retenir. Les passkeys
 * (WebAuthn) pourront s'ajouter plus tard côté Supabase (actuellement en bêta) sans rien casser
 * pour les comptes déjà créés ainsi.
 */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Synchronisation non configurée." };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined,
      shouldCreateUser: true,
    },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
