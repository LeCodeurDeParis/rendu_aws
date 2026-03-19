import { sql } from "../services/aws_rds.js";
import type { TeamInvitation } from "../types/index.js";

export async function create(teamId: number, email: string, invitedBySub: string): Promise<TeamInvitation> {
  const [inv] = await sql<TeamInvitation[]>`
    INSERT INTO team_invitations (team_id, email, status, invited_by_sub)
    VALUES (${teamId}, ${email}, 'pending', ${invitedBySub})
    RETURNING *
  `;
  return inv;
}

export async function findById(id: number): Promise<TeamInvitation | null> {
  const [inv] = await sql<TeamInvitation[]>`SELECT * FROM team_invitations WHERE id = ${id}`;
  return inv ?? null;
}

export async function findByEmail(email: string): Promise<TeamInvitation[]> {
  return sql<TeamInvitation[]>`
    SELECT * FROM team_invitations WHERE email = ${email} AND status = 'pending'
    ORDER BY created_at DESC
  `;
}

export async function accept(id: number): Promise<void> {
  await sql`UPDATE team_invitations SET status = 'accepted' WHERE id = ${id}`;
}

export async function refuse(id: number): Promise<void> {
  await sql`UPDATE team_invitations SET status = 'refused' WHERE id = ${id}`;
}
