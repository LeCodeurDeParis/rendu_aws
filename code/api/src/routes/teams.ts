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

teamsRoutes.delete("/:id/members/:memberSub", async (c) => {
  const sub = c.get("cognitoSub");
  const teamId = Number(c.req.param("id"));
  const memberSub = decodeURIComponent(c.req.param("memberSub"));

  const isMember = await teamsRepo.isMember(teamId, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const requesterRole = await teamsRepo.getMemberRole(teamId, sub);
  if (requesterRole !== "owner") {
    return c.json({ error: "Only the team owner can remove members" }, 403);
  }

  const targetRole = await teamsRepo.getMemberRole(teamId, memberSub);
  if (targetRole == null) return c.json({ error: "Member not found" }, 404);
  if (targetRole === "owner") {
    return c.json({ error: "Cannot remove the team owner" }, 400);
  }

  const removed = await teamsRepo.removeMember(teamId, memberSub);
  if (!removed) return c.json({ error: "Could not remove member" }, 400);

  return c.json({ message: "Member removed" });
});
