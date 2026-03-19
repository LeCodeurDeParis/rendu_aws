"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Plus, GripVertical, Trash2 } from "lucide-react";

interface Task {
  id: number;
  name: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  assignee_sub: string | null;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
}

const COLUMNS = [
  { key: "todo" as const, label: "À faire", color: "bg-orange-500" },
  { key: "in_progress" as const, label: "En cours", color: "bg-blue-500" },
  { key: "done" as const, label: "Terminé", color: "bg-green-500" },
];

export default function ProjectBoardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);

  const loadTasks = useCallback(() => {
    if (!projectId) return;
    Promise.all([
      api.get<Project>(`/projects/${projectId}`),
      api.get<Task[]>(`/tasks/projects/${projectId}`),
    ]).then(([p, t]) => {
      setProject(p);
      setTasks(t);
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      router.replace("/dashboard");
      return;
    }
    loadTasks();
  }, [projectId, router, loadTasks]);

  async function addTask(status: string) {
    if (!newTaskName.trim() || !projectId) return;
    const task = await api.post<Task>(`/tasks/projects/${projectId}`, { name: newTaskName });
    if (status !== "todo") {
      await api.put<Task>(`/tasks/${task.id}`, { status });
      task.status = status as Task["status"];
    }
    setTasks((prev) => [...prev, task]);
    setNewTaskName("");
    setAddingToColumn(null);
  }

  async function moveTask(taskId: number, newStatus: string) {
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t)));
  }

  async function deleteTask(taskId: number) {
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  if (!projectId) return null;
  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project?.name ?? "Projet"}</h1>
        {project?.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(({ key, label, color }) => {
          const columnTasks = tasks.filter((t) => t.status === key);
          return (
            <div
              key={key}
              className="rounded-lg bg-muted/50 p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId) moveTask(Number(taskId), key);
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setAddingToColumn(key)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("taskId", String(task.id))}
                    className="group cursor-grab rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        <div>
                          <p className="text-sm font-medium">{task.name}</p>
                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}

                {addingToColumn === key && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addTask(key);
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="text"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="Nom de la tâche"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        Ajouter
                      </button>
                      <button type="button" onClick={() => setAddingToColumn(null)} className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent">
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
