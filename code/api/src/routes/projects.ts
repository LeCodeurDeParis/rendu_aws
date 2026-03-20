import { Hono } from "hono";
import { projectsRepo, teamsRepo } from "@iim/domain";
import type { Env } from "../index.js";

export const projectsRoutes = new Hono<Env>();

projectsRoutes.post("/teams/:teamId", async (c) => {
  const sub = c.get("cognitoSub");
  const teamId = Number(c.req.param("teamId"));
  const isMember = await teamsRepo.isMember(teamId, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const { name, description } = await c.req.json<{ name: string; description?: string }>();
  if (!name) return c.json({ error: "name is required" }, 400);
  const project = await projectsRepo.create(name, description ?? null, teamId);
  return c.json(project, 201);
});

projectsRoutes.get("/teams/:teamId", async (c) => {
  const sub = c.get("cognitoSub");
  const teamId = Number(c.req.param("teamId"));
  const isMember = await teamsRepo.isMember(teamId, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const projects = await projectsRepo.findByTeam(teamId);
  return c.json(projects);
});

projectsRoutes.get("/:id", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const project = await projectsRepo.findById(id);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);
  return c.json(project);
});

projectsRoutes.put("/:id", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const project = await projectsRepo.findById(id);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const body = await c.req.json<{ name?: string; description?: string | null }>();
  if (body.name !== undefined && !String(body.name).trim()) {
    return c.json({ error: "name cannot be empty" }, 400);
  }
  const updated = await projectsRepo.update(id, {
    ...(body.name !== undefined && { name: String(body.name).trim() }),
    ...(body.description !== undefined && { description: body.description }),
  });
  if (!updated) return c.json({ error: "Project not found" }, 404);
  return c.json(updated);
});

projectsRoutes.delete("/:id", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const project = await projectsRepo.findById(id);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  await projectsRepo.remove(id);
  return c.json({ message: "Project deleted" });
});
