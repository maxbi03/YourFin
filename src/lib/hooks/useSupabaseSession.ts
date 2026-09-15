"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSyncConfigured } from "@/lib/supabase/client";

export interface SessionState {
  loading: boolean;
  session: Session | null;
}

/** Session Supabase courante, tenue à jour en direct (connexion, déconnexion, lien magique cliqué). */
export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: isSyncConfigured, session: null });

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, session: data.session });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ loading: false, session });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
