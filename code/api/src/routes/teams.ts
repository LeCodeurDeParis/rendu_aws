import { Hono } from "hono";
import { teamsRepo, cognito } from "@iim/domain";
import type { Env } from "../index.js";

export const teamsRoutes = new Hono<Env>();

teamsRoutes.post("/", async (c) => {
  const sub = c.get("cognitoSub");
  const { name } = await c.req.json<{ name: string }>();
  if (!name) return c.json({ error: "name is required" }, 400);
  const team = await teamsRepo.create(name, sub);
  return c.json(team, 201);
});

teamsRoutes.get("/", async (c) => {
  const sub = c.get("cognitoSub");
  const teams = await teamsRepo.findByUser(sub);
  return c.json(teams);
});

teamsRoutes.get("/:id/members", async (c) => {
  const sub = c.get("cognitoSub");
  const teamId = Number(c.req.param("id"));
  const member = await teamsRepo.isMember(teamId, sub);
  if (!member) return c.json({ error: "Not a member of this team" }, 403);

  const members = await teamsRepo.getMembers(teamId);
  const enriched = await Promise.all(
    members.map(async (m) => {
      const user = await cognito.getUserBySub(m.cognito_sub);
      return { ...m, user };
    })
  );
  return c.json(enriched);
});
