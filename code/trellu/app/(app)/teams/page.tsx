"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProjectModal, type ProjectPayload } from "@/components/project-modal";
import { Plus, FolderKanban, Users, Pencil, Trash2 } from "lucide-react";

interface Project extends ProjectPayload {
  created_at: string;
}

interface Team {
  id: number;
  name: string;
}

export default function TeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const teamId = searchParams.get("teamId");
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
  const [inviteFeedback, setInviteFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!teamId) {
      router.replace("/dashboard");
      return;
    }
    Promise.all([
      api.get<Team[]>("/teams").then((teams) => teams.find((t) => t.id === Number(teamId))),
      api.get<Project[]>(`/projects/teams/${teamId}`),
    ]).then(([t, p]) => {
      setTeam(t ?? null);
      setProjects(p ?? []);
      setLoading(false);
    });
  }, [teamId, router]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !teamId) return;
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

  async function deleteProject(projectId: number) {
    if (!confirm("Supprimer ce projet ? Toutes les tâches associées seront supprimées.")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      /* ignore */
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !teamId) return;
    setInviting(true);
    setInviteFeedback(null);
    try {
      await api.post(`/invitations/${teamId}`, { email: inviteEmail });
      setInviteEmail("");
      setShowInvite(false);
      setInviteFeedback({
        ok: true,
        message:
          "Invitation créée. La personne pourra l'accepter depuis l'application après connexion ; un email de confirmation lui sera envoyé à l'acceptation.",
      });
    } catch (err) {
      setInviteFeedback({
        ok: false,
        message: err instanceof Error ? err.message : "Impossible d'envoyer l'invitation.",
      });
    } finally {
      setInviting(false);
    }
  }

  if (!teamId) return null;
  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      {inviteFeedback && (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            inviteFeedback.ok
              ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          }`}
        >
          {inviteFeedback.message}
          <button
            type="button"
            onClick={() => setInviteFeedback(null)}
            className="ml-3 underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{team?.name ?? "Équipe"}</h1>
          <p className="text-sm text-muted-foreground">Projets et membres de l&apos;équipe</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/teams/members?teamId=${teamId}`}
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
            <div
              key={project.id}
              className="group relative rounded-lg border transition-colors hover:border-primary/50"
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(project)}
                  className="rounded-md border bg-background p-1.5 shadow-sm hover:bg-accent"
                  aria-label="Modifier le projet"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteProject(project.id)}
                  className="rounded-md border bg-background p-1.5 text-destructive shadow-sm hover:bg-destructive/10"
                  aria-label="Supprimer le projet"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Link
                href={`/projects?projectId=${project.id}`}
                className="block p-6 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold group-hover:text-primary">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {editingProject && teamId && (
        <ProjectModal
          open
          onClose={() => setEditingProject(null)}
          project={editingProject}
          onSaved={(p) => {
            setProjects((prev) =>
              prev.map((x) => (x.id === p.id ? { ...x, ...p } : x))
            );
            setEditingProject(null);
          }}
          onDeleted={() => {
            setProjects((prev) => prev.filter((x) => x.id !== editingProject.id));
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
