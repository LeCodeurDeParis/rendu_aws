"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Plus, FolderKanban, Users } from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
}

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Team[]>("/teams").then((teams) => teams.find((t) => t.id === Number(teamId))),
      api.get<Project[]>(`/projects/teams/${teamId}`),
    ]).then(([t, p]) => {
      setTeam(t ?? null);
      setProjects(p);
      setLoading(false);
    });
  }, [teamId]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const project = await api.post<Project>(`/projects/teams/${teamId}`, { name, description: description || null });
      setProjects((prev) => [project, ...prev]);
      setName("");
      setDescription("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/invitations/${teamId}`, { email: inviteEmail });
      setInviteEmail("");
      setShowInvite(false);
    } finally {
      setInviting(false);
    }
  }

  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{team?.name ?? "Équipe"}</h1>
          <p className="text-sm text-muted-foreground">Projets et membres de l&apos;équipe</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/teams/${teamId}/members`}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Membres
          </Link>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Inviter
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </button>
        </div>
      </div>

      {showInvite && (
        <form onSubmit={inviteMember} className="flex gap-3 rounded-lg border p-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email du membre à inviter"
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <button type="submit" disabled={inviting} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {inviting ? "..." : "Inviter"}
          </button>
          <button type="button" onClick={() => setShowInvite(false)} className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent">
            Annuler
          </button>
        </form>
      )}

      {showCreate && (
        <form onSubmit={createProject} className="space-y-3 rounded-lg border p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du projet"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {creating ? "..." : "Créer"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent">
              Annuler
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">Aucun projet dans cette équipe</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-lg border p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary">{project.name}</h3>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
