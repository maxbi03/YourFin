"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ThemePref } from "@/lib/domain/types";

const STORAGE_KEY = "yf-theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* stockage indisponible (navigation privée) : le thème s'applique quand même */
  }
}

/** Applique la préférence de thème (réglages) sur <html> et suit les changements système. */
export function useApplyTheme(pref: ThemePref | undefined) {
  useEffect(() => {
    if (!pref) return;
    apply(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);
}

function subscribeDark(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Vrai quand le mode sombre est actuellement affiché (utile pour les couleurs des graphiques). */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribeDark,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}
