import { Hono } from "hono";
import { tasksRepo, projectsRepo, teamsRepo } from "@iim/domain";
import type { Env } from "../index.js";

export const tasksRoutes = new Hono<Env>();

async function checkProjectAccess(projectId: number, sub: string): Promise<string | null> {
  const project = await projectsRepo.findById(projectId);
  if (!project) return "Project not found";
  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return "Not a member of this team";
  return null;
}

tasksRoutes.post("/projects/:projectId", async (c) => {
  const sub = c.get("cognitoSub");
  const projectId = Number(c.req.param("projectId"));
  const err = await checkProjectAccess(projectId, sub);
  if (err) return c.json({ error: err }, 403);

  const { name, description } = await c.req.json<{ name: string; description?: string }>();
  if (!name) return c.json({ error: "name is required" }, 400);
  const task = await tasksRepo.create(name, description ?? null, projectId);
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

  const body = await c.req.json<{ name?: string; description?: string; status?: string; assignee_sub?: string | null }>();
  const updated = await tasksRepo.update(id, body);
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
