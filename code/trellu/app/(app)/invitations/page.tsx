"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { normalizePathname } from "@/lib/normalize-pathname";
import { Mail, Check, X } from "lucide-react";

interface Invitation {
  id: number;
  team_id: number;
  email: string;
  status: string;
  created_at: string;
}

function InvitationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const acceptParam = searchParams.get("accept");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptBanner, setAcceptBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadError(null);
      try {
        const list = await api.get<Invitation[]>("/invitations");
        if (cancelled) return;
        setInvitations(list);

        if (acceptParam) {
          const id = Number(acceptParam);
          if (Number.isFinite(id)) {
            try {
              await api.put(`/invitations/${id}/accept`, {});
              if (cancelled) return;
              setInvitations((prev) => prev.filter((i) => i.id !== id));
              setAcceptBanner("Invitation acceptée — vous avez rejoint l'équipe.");
              router.replace(pathname);
            } catch {
              if (!cancelled) {
                setAcceptBanner(
                  "Impossible d'accepter cette invitation (déjà traitée, mauvais compte, ou erreur serveur)."
                );
              }
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Impossible de charger les invitations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [acceptParam, pathname, router]);

  async function accept(id: number) {
    try {
      await api.put(`/invitations/${id}/accept`, {});
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erreur à l'acceptation.");
    }
  }

  async function refuse(id: number) {
    try {
      await api.put(`/invitations/${id}/refuse`, {});
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erreur au refus.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invitations</h1>
        <p className="text-sm text-muted-foreground">Invitations en attente</p>
      </div>

      {acceptBanner && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100"
        >
          {acceptBanner}
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">Aucune invitation en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Invitation à une équipe</p>
                <p className="text-sm text-muted-foreground">
                  Reçue le {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => accept(inv.id)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={() => refuse(inv.id)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvitationsPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Chargement...</div>}>
      <InvitationsContent />
    </Suspense>
  );
}
