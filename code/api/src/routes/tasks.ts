import { Hono } from "hono";
import { tasksRepo, projectsRepo, teamsRepo } from "@iim/domain";
import type { Env } from "../index.js";

export const tasksRoutes = new Hono<Env>();

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

async function checkProjectAccess(projectId: number, sub: string): Promise<string | null> {
  const project = await projectsRepo.findById(projectId);
  if (!project) return "Project not found";
  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return "Not a member of this team";
  return null;
}

async function assertAssigneeIsTeamMember(
  teamId: number,
  assigneeSub: string | null | undefined
): Promise<boolean> {
  if (assigneeSub == null || assigneeSub === "") return true;
  return teamsRepo.isMember(teamId, assigneeSub);
}

tasksRoutes.post("/projects/:projectId", async (c) => {
  const sub = c.get("cognitoSub");
  const projectId = Number(c.req.param("projectId"));
  const err = await checkProjectAccess(projectId, sub);
  if (err) return c.json({ error: err }, err === "Project not found" ? 404 : 403);

  const project = await projectsRepo.findById(projectId);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const body = await c.req.json<{
    name: string;
    description?: string | null;
    status?: string;
    assignee_sub?: string | null;
  }>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  const status =
    body.status && TASK_STATUSES.includes(body.status as (typeof TASK_STATUSES)[number])
      ? body.status
      : "todo";

  const assignee = body.assignee_sub === "" ? null : body.assignee_sub ?? null;
  if (!(await assertAssigneeIsTeamMember(project.team_id, assignee))) {
    return c.json({ error: "Assignee is not a member of this team" }, 400);
  }

  const task = await tasksRepo.create(
    body.name.trim(),
    body.description ?? null,
    projectId,
    status,
    assignee
  );
  return c.json(task, 201);
});

tasksRoutes.get("/projects/:projectId", async (c) => {
  const sub = c.get("cognitoSub");
  const projectId = Number(c.req.param("projectId"));
  const err = await checkProjectAccess(projectId, sub);
  if (err) return c.json({ error: err }, 403);

  const tasks = await tasksRepo.findByProject(projectId);
  return c.json(tasks);
});

tasksRoutes.put("/:id", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const task = await tasksRepo.findById(id);
  if (!task) return c.json({ error: "Task not found" }, 404);

  const err = await checkProjectAccess(task.project_id, sub);
  if (err) return c.json({ error: err }, 403);

  const project = await projectsRepo.findById(task.project_id);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const body = await c.req.json<{
    name?: string;
    description?: string | null;
    status?: string;
    assignee_sub?: string | null;
  }>();

  if (body.status != null && !TASK_STATUSES.includes(body.status as (typeof TASK_STATUSES)[number])) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const assignee =
    body.assignee_sub === undefined ? undefined : body.assignee_sub === "" ? null : body.assignee_sub;
  if (assignee !== undefined && assignee !== null && !(await assertAssigneeIsTeamMember(project.team_id, assignee))) {
    return c.json({ error: "Assignee is not a member of this team" }, 400);
  }

  const payload: {
    name?: string;
    description?: string | null;
    status?: string;
    assignee_sub?: string | null;
  } = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.description !== undefined) payload.description = body.description;
  if (body.status !== undefined) payload.status = body.status;
  if (assignee !== undefined) payload.assignee_sub = assignee;

  const updated = await tasksRepo.update(id, payload);
  if (!updated) return c.json({ error: "Task not found" }, 404);
  return c.json(updated);
});

tasksRoutes.delete("/:id", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const task = await tasksRepo.findById(id);
  if (!task) return c.json({ error: "Task not found" }, 404);

  const err = await checkProjectAccess(task.project_id, sub);
  if (err) return c.json({ error: err }, 403);

  await tasksRepo.remove(id);
  return c.json({ message: "Task deleted" });
});
