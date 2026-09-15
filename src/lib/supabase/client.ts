"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase — sert uniquement au compte optionnel (synchronisation, Pro).
 * L'app fonctionne entièrement sans lui : tant que les variables d'environnement ne sont
 * pas renseignées, `getSupabaseClient()` renvoie `null` et l'UI masque tout ce qui dépend
 * d'un compte (voir `isSyncConfigured`).
 *
 * La clé "anon" est volontairement publique (exposée au navigateur) : la protection des
 * données vient des policies Row Level Security côté base (voir supabase/migrations/), pas
 * du secret de cette clé.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSyncConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSyncConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Détecte le retour d'un lien magique (#access_token=...) dans l'URL au chargement.
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
