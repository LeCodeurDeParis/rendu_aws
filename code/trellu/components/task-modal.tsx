"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: number;
  name: string;
  description: string | null;
  status: TaskStatus;
  assignee_sub: string | null;
}

interface TeamMemberRow {
  cognito_sub: string;
  role: string;
  user: { sub: string; email: string; name: string } | null;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminé" },
];

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  projectId: number;
  /** Colonne par défaut à la création */
  defaultStatus?: TaskStatus;
  task?: Task | null;
  members: TeamMemberRow[];
  onSaved: (task: Task) => void;
  onDeleted?: (taskId: number) => void;
}

export function TaskModal({
  open,
  onClose,
  mode,
  projectId,
  defaultStatus = "todo",
  task,
  members,
  onSaved,
  onDeleted,
}: TaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [assigneeSub, setAssigneeSub] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && task) {
      setName(task.name);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setAssigneeSub(task.assignee_sub ?? "");
    } else {
      setName("");
      setDescription("");
      setStatus(defaultStatus);
      setAssigneeSub("");
    }
  }, [open, mode, task, defaultStatus]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        assignee_sub: assigneeSub === "" ? null : assigneeSub,
      };
      if (mode === "create") {
        const created = await api.post<Task>(`/tasks/projects/${projectId}`, body);
        onSaved(created);
      } else if (task) {
        const updated = await api.put<Task>(`/tasks/${task.id}`, body);
        onSaved(updated);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task || !onDeleted) return;
    if (!confirm("Supprimer cette tâche ?")) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDeleted(task.id);
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
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Nouvelle tâche" : "Modifier la tâche"}
          </h2>
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
            <label htmlFor="task-name" className="text-sm font-medium">
              Nom
            </label>
            <input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="task-desc" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="task-status" className="text-sm font-medium">
              Statut
            </label>
            <select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="task-assignee" className="text-sm font-medium">
              Assigné à
            </label>
            <select
              id="task-assignee"
              value={assigneeSub}
              onChange={(e) => setAssigneeSub(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Non assigné —</option>
              {members.map((m) => (
                <option key={m.cognito_sub} value={m.cognito_sub}>
                  {m.user?.name || m.user?.email || m.cognito_sub.slice(0, 8) + "…"}
                </option>
              ))}
            </select>
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
              {saving ? "…" : mode === "create" ? "Créer" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Annuler
            </button>
            {mode === "edit" && task && onDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto inline-flex h-9 items-center rounded-md border border-destructive/50 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting ? "…" : "Supprimer"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
