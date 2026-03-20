"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

export interface ProjectPayload {
  id: number;
  name: string;
  description: string | null;
  team_id: number;
}

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  project: ProjectPayload | null;
  onSaved: (p: ProjectPayload) => void;
  /** Si défini, affiche le bouton supprimer */
  onDeleted?: () => void;
}

export function ProjectModal({ open, onClose, project, onSaved, onDeleted }: ProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    setError(null);
    setName(project.name);
    setDescription(project.description ?? "");
  }, [open, project]);

  if (!open || !project) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = project;
    if (!p || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<ProjectPayload>(`/projects/${p.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDeleted) return;
    const p = project;
    if (!p) return;
    if (!confirm("Supprimer ce projet ? Toutes les tâches associées seront supprimées.")) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/projects/${p.id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Projet</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-sm font-medium">
              Nom
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="project-desc" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Annuler
            </button>
            {onDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto inline-flex h-9 items-center rounded-md border border-destructive/50 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting ? "…" : "Supprimer le projet"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
