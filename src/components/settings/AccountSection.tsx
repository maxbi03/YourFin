"use client";

import { CloudUpload, CloudDownload, LogOut, Mail, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, ConfirmSheet, Field, Input, SectionTitle } from "@/components/ui/primitives";
import { isSyncConfigured } from "@/lib/supabase/client";
import { sendMagicLink, signOut } from "@/lib/supabase/auth";
import { pullSnapshotFromCloud, pushSnapshotToCloud } from "@/lib/supabase/sync";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";

type Status = { kind: "idle" | "busy" | "error" | "done"; message?: string };

/**
 * Section "Compte & synchronisation" — masquée tant que Supabase n'est pas configuré
 * (voir lib/supabase/client.ts). Le local reste le fonctionnement par défaut dans tous les cas :
 * rien ici n'est requis pour utiliser YourFin.
 */
export function AccountSection() {
  if (!isSyncConfigured) return null;
  return <AccountSectionInner />;
}

function AccountSectionInner() {
  const { loading, session } = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmPull, setConfirmPull] = useState(false);

  async function onSendLink() {
    if (!email.trim()) return;
    setStatus({ kind: "busy" });
    const { error } = await sendMagicLink(email);
    if (error) setStatus({ kind: "error", message: error });
    else {
      setLinkSent(true);
      setStatus({ kind: "idle" });
    }
  }

  async function onPush() {
    if (!session) return;
    setStatus({ kind: "busy" });
    try {
      await pushSnapshotToCloud(session.user.id);
      setStatus({ kind: "done", message: "Données envoyées vers le compte." });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Échec de l'envoi." });
    }
  }

  async function onPull() {
    if (!session) return;
    setStatus({ kind: "busy" });
    try {
      await pullSnapshotFromCloud(session.user.id);
      setStatus({ kind: "done", message: "Données de cet appareil remplacées par celles du compte." });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Échec de la récupération." });
    }
  }

  return (
    <section>
      <SectionTitle hint="Optionnel — le local reste le fonctionnement par défaut, gratuit et sans compte.">Compte & synchronisation</SectionTitle>
      <Card className="p-4">
        {loading ? (
          <p className="text-[13px] text-ink-2">Chargement…</p>
        ) : !session ? (
          <div className="space-y-3">
            {!linkSent ? (
              <>
                <Field label="E-mail">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.ch" autoComplete="email" onKeyDown={(e) => e.key === "Enter" && onSendLink()} />
                </Field>
                <Button full onClick={onSendLink} disabled={status.kind === "busy" || !email.trim()}>
                  <Mail size={16} /> Recevoir un lien de connexion
                </Button>
                <p className="text-[12px] text-ink-3">Pas de mot de passe : un lien cliquable t&apos;est envoyé par e-mail, valable une fois.</p>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Mail size={17} /></span>
                <div>
                  <p className="text-[14px] font-medium">Vérifie tes e-mails</p>
                  <p className="text-[13px] text-ink-2">Un lien de connexion a été envoyé à {email}. Ouvre-le sur cet appareil pour continuer.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive"><CheckCircle2 size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{session.user.email}</p>
                <p className="text-[12px] text-ink-2">Connecté</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => signOut()}><LogOut size={15} /> Déconnexion</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="soft" onClick={onPush} disabled={status.kind === "busy"}>
                <CloudUpload size={15} /> Envoyer vers le compte
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmPull(true)} disabled={status.kind === "busy"}>
                <CloudDownload size={15} /> Récupérer du compte
              </Button>
            </div>
          </div>
        )}
        {status.kind === "error" && <p className="mt-3 rounded-xl bg-negative-soft px-3 py-2 text-[13px] font-medium text-negative">{status.message}</p>}
        {status.kind === "done" && <p className="mt-3 rounded-xl bg-positive-soft px-3 py-2 text-[13px] font-medium text-positive">{status.message}</p>}
      </Card>

      <ConfirmSheet
        open={confirmPull}
        onClose={() => setConfirmPull(false)}
        onConfirm={onPull}
        title="Récupérer les données du compte ?"
        message="Remplace les données de cet appareil par celles enregistrées sur le compte. Exporte une sauvegarde avant si tu as des données locales récentes non encore envoyées."
        confirmLabel="Remplacer"
        danger
      />
    </section>
  );
}
