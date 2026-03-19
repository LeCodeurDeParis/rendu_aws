import { Hono } from "hono";
import { cognito, tasksRepo, backupsRepo } from "@iim/domain";
import { sql } from "@iim/domain";
import { adminMiddleware } from "../middleware/admin.js";
import type { Env } from "../index.js";

export const adminRoutes = new Hono<Env>();

adminRoutes.use("*", adminMiddleware);

adminRoutes.get("/stats", async (c) => {
  const [usersCount] = await Promise.all([cognito.listUsers()]);
  const [{ count: teamsCount }] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM teams`;
  const [{ count: projectsCount }] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM projects`;
  const tasksCount = await tasksRepo.countAll();

  return c.json({
    users: usersCount.length,
    teams: parseInt(teamsCount, 10),
    projects: parseInt(projectsCount, 10),
    tasks: tasksCount,
  });
});

adminRoutes.get("/users", async (c) => {
  const users = await cognito.listUsers();
  return c.json(users);
});

adminRoutes.get("/backups", async (c) => {
  const backups = await backupsRepo.findAll();
  return c.json(backups);
});
