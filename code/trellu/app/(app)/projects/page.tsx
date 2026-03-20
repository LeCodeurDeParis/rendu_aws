"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TaskModal, type Task, type TaskStatus } from "@/components/task-modal";
import { ProjectModal, type ProjectPayload } from "@/components/project-modal";
import { TaskFiles, type TaskFileRow } from "@/components/task-files";
import { Plus, GripVertical, Trash2, Pencil } from "lucide-react";

interface Project extends ProjectPayload {}

interface TeamMemberRow {
  cognito_sub: string;
  role: string;
  user: { sub: string; email: string; name: string } | null;
}

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "À faire", color: "bg-orange-500" },
  { key: "in_progress", label: "En cours", color: "bg-blue-500" },
  { key: "done", label: "Terminé", color: "bg-green-500" },
];

export default function ProjectBoardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    defaultStatus?: TaskStatus;
    task?: Task | null;
  } | null>(null);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [taskFiles, setTaskFiles] = useState<Record<number, TaskFileRow[]>>({});

  const loadTasks = useCallback(() => {
    if (!projectId) return;
    Promise.all([
      api.get<Project>(`/projects/${projectId}`),
      api.get<Task[]>(`/tasks/projects/${projectId}`),
    ]).then(async ([p, t]) => {
      setProject(p);
      setTasks(t);
      try {
        const m = await api.get<TeamMemberRow[]>(`/teams/${p.team_id}/members`);
        setMembers(m);
      } catch {
        setMembers([]);
      }
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

  useEffect(() => {
    if (!tasks.length) {
      setTaskFiles({});
      return;
    }
    let cancelled = false;
    Promise.all(
      tasks.map((t) =>
        api.get<TaskFileRow[]>(`/files/tasks/${t.id}`).then((f) => [t.id, f] as const)
      )
    ).then((entries) => {
      if (!cancelled) setTaskFiles(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [tasks]);

  function assigneeLabel(sub: string | null): string | null {
    if (!sub) return null;
    const m = members.find((x) => x.cognito_sub === sub);
    return m?.user?.name || m?.user?.email || null;
  }

  async function moveTask(taskId: number, newStatus: string) {
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t))
    );
  }

  function handleSaved(task: Task) {
    setTasks((prev) => {
      const i = prev.findIndex((t) => t.id === task.id);
      if (i === -1) return [...prev, task];
      const next = [...prev];
      next[i] = task;
      return next;
    });
  }

  function handleDeleted(taskId: number) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function deleteTaskQuick(taskId: number) {
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTaskFiles((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }

  if (!projectId) return null;
  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project?.name ?? "Projet"}</h1>
          {project?.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
        {project && (
          <button
            type="button"
            onClick={() => setProjectSettingsOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
            Modifier le projet
          </button>
        )}
      </div>

      {project && (
        <ProjectModal
          open={projectSettingsOpen}
          onClose={() => setProjectSettingsOpen(false)}
          project={project}
          onSaved={(p) => {
            setProject(p);
            setProjectSettingsOpen(false);
          }}
          onDeleted={() => {
            void router.push(`/teams?teamId=${project.team_id}`);
          }}
        />
      )}

      {modal && project && (
        <TaskModal
          open
          onClose={() => setModal(null)}
          mode={modal.mode}
          projectId={project.id}
          defaultStatus={modal.defaultStatus}
          task={modal.task ?? undefined}
          members={members}
          onSaved={handleSaved}
          onDeleted={modal.mode === "edit" ? handleDeleted : undefined}
        />
      )}

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
                  type="button"
                  onClick={() => setModal({ mode: "create", defaultStatus: key })}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                  aria-label="Nouvelle tâche"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {columnTasks.map((task) => {
                  const assigneeName = assigneeLabel(task.assignee_sub);
                  return (
                  <div
                    key={task.id}
                    className="group rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("taskId", String(task.id))}
                        className="mt-0.5 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 active:cursor-grabbing"
                        aria-hidden
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setModal({ mode: "edit", task })}
                        >
                          <p className="text-sm font-medium">{task.name}</p>
                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          {assigneeName && (
                            <p className="mt-1 text-xs text-primary/80">{assigneeName}</p>
                          )}
                        </button>
                        <div
                          className="mt-1"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TaskFiles
                            taskId={task.id}
                            files={taskFiles[task.id] ?? []}
                            compact
                            onFilesChange={(next) =>
                              setTaskFiles((prev) => ({ ...prev, [task.id]: next }))
                            }
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTaskQuick(task.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
