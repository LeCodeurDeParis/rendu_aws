"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";

import { api } from "@/lib/api";

interface Member {
  id: number;
  cognito_sub: string;
  role: string;
  joined_at: string;
  user: { sub: string; email: string; name: string; role: string } | null;
}

export default function MembersPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Member[]>(`/teams/${teamId}/members`).then(setMembers).finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teams/${teamId}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Membres</h1>
          <p className="text-sm text-muted-foreground">Membres de l&apos;équipe</p>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{m.user?.name ?? "Utilisateur"}</p>
                  <p className="text-sm text-muted-foreground">{m.user?.email ?? m.cognito_sub}</p>
                </div>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
