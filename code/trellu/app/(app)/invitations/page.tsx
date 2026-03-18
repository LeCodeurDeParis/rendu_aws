"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Mail, Check, X } from "lucide-react";

interface Invitation {
  id: number;
  team_id: number;
  email: string;
  status: string;
  created_at: string;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Invitation[]>("/invitations").then(setInvitations).finally(() => setLoading(false));
  }, []);

  async function accept(id: number) {
    await api.put(`/invitations/${id}/accept`, {});
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }

  async function refuse(id: number) {
    await api.put(`/invitations/${id}/refuse`, {});
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invitations</h1>
        <p className="text-sm text-muted-foreground">Invitations en attente</p>
      </div>

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
                  onClick={() => accept(inv.id)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                  Accepter
                </button>
                <button
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
