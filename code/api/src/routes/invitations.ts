import { Hono } from "hono";
import {
  invitationsRepo,
  teamsRepo,
  cognito,
  ses,
  invitationEmailFailureMessage,
} from "@iim/domain";
import type { Env } from "../index.js";

export const invitationsRoutes = new Hono<Env>();

function invitationAcceptUrl(invitationId: number): string {
  const raw = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const base = raw.replace(/\/+$/, "");
  return `${base}/invitations?accept=${invitationId}`;
}

invitationsRoutes.post("/:teamId", async (c) => {
  const sub = c.get("cognitoSub");
  const teamId = Number(c.req.param("teamId"));
  const { email } = await c.req.json<{ email: string }>();

  const isMember = await teamsRepo.isMember(teamId, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const team = await teamsRepo.findById(teamId);
  if (!team) return c.json({ error: "Team not found" }, 404);

  const inviter = await cognito.getUserBySub(sub);
  const invitation = await invitationsRepo.create(teamId, email, sub);

  const acceptUrl = invitationAcceptUrl(invitation.id);
  let emailSent = true;
  let emailError: string | null = null;
  try {
    await ses.sendInvitationEmail(
      email,
      team.name,
      inviter?.name ?? "Un membre",
      acceptUrl,
    );
  } catch (err) {
    emailSent = false;
    emailError = invitationEmailFailureMessage(err);
    console.error("Failed to send invitation email:", err);
  }

  return c.json({ ...invitation, emailSent, emailError }, 201);
});

invitationsRoutes.get("/", async (c) => {
  const sub = c.get("cognitoSub");
  const user = await cognito.getUserBySub(sub);
  if (!user) return c.json({ error: "User not found" }, 404);
  const invitations = await invitationsRepo.findByEmail(user.email);
  return c.json(invitations);
});

invitationsRoutes.put("/:id/accept", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const invitation = await invitationsRepo.findById(id);
  if (!invitation) return c.json({ error: "Invitation not found" }, 404);

  const user = await cognito.getUserBySub(sub);
  if (user?.email !== invitation.email)
    return c.json({ error: "Not your invitation" }, 403);

  await invitationsRepo.accept(id);
  await teamsRepo.addMember(invitation.team_id, sub);
  return c.json({ message: "Invitation accepted" });
});

invitationsRoutes.put("/:id/refuse", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const invitation = await invitationsRepo.findById(id);
  if (!invitation) return c.json({ error: "Invitation not found" }, 404);

  const user = await cognito.getUserBySub(sub);
  if (user?.email !== invitation.email)
    return c.json({ error: "Not your invitation" }, 403);

  await invitationsRepo.refuse(id);
  return c.json({ message: "Invitation refused" });
});
