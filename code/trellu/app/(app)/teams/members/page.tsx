"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, UserMinus } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Member {
  id: number;
  cognito_sub: string;
  role: string;
  joined_at: string;
  user: { sub: string; email: string; name: string; role: string } | null;
}

export default function MembersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sub: currentSub } = useAuth();
  const teamId = searchParams.get("teamId");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMember = members.find((m) => m.cognito_sub === currentSub);
  const isOwner = currentMember?.role === "owner";

  useEffect(() => {
    if (!teamId) {
      router.replace("/dashboard");
      return;
    }
    api
      .get<Member[]>(`/teams/${teamId}/members`)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [teamId, router]);

  async function removeMemberFromTeam(targetSub: string) {
    if (!teamId) return;
    setError(null);
    if (!confirm("Retirer ce membre de l'équipe ?")) return;
    setRemoving(targetSub);
    try {
      await api.delete(`/teams/${teamId}/members/${encodeURIComponent(targetSub)}`);
      setMembers((prev) => prev.filter((m) => m.cognito_sub !== targetSub));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de retirer le membre");
    } finally {
      setRemoving(null);
    }
  }

  if (!teamId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teams?teamId=${teamId}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Membres</h1>
          <p className="text-sm text-muted-foreground">Membres de l&apos;équipe</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const canRemove = isOwner && m.role !== "owner";
            return (
              <div key={m.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{m.user?.name ?? "Utilisateur"}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.user?.email ?? m.cognito_sub}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {m.role === "owner" ? "Propriétaire" : m.role === "member" ? "Membre" : m.role}
                  </span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => removeMemberFromTeam(m.cognito_sub)}
                      disabled={removing === m.cognito_sub}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/40 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {removing === m.cognito_sub ? "…" : "Retirer"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
