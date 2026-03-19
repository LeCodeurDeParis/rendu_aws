import { sql } from "../services/aws_rds.js";
import type { Team, TeamMember } from "../types/index.js";

export async function create(name: string, cognitoSub: string): Promise<Team> {
  const [team] = await sql<Team[]>`
    INSERT INTO teams (name, cognito_sub)
    VALUES (${name}, ${cognitoSub})
    RETURNING *
  `;
  await sql`
    INSERT INTO team_members (team_id, cognito_sub, role)
    VALUES (${team.id}, ${cognitoSub}, 'owner')
  `;
  return team;
}

export async function findById(id: number): Promise<Team | null> {
  const [team] = await sql<Team[]>`SELECT * FROM teams WHERE id = ${id}`;
  return team ?? null;
}

export async function findByUser(cognitoSub: string): Promise<Team[]> {
  return sql<Team[]>`
    SELECT t.* FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.cognito_sub = ${cognitoSub}
    ORDER BY t.created_at DESC
  `;
}

export async function getMembers(teamId: number): Promise<TeamMember[]> {
  return sql<TeamMember[]>`
    SELECT * FROM team_members WHERE team_id = ${teamId} ORDER BY joined_at ASC
  `;
}

export async function isMember(teamId: number, cognitoSub: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM team_members WHERE team_id = ${teamId} AND cognito_sub = ${cognitoSub}
  `;
  return !!row;
}

export async function addMember(teamId: number, cognitoSub: string, role: string = "member"): Promise<void> {
  await sql`
    INSERT INTO team_members (team_id, cognito_sub, role)
    VALUES (${teamId}, ${cognitoSub}, ${role})
    ON CONFLICT DO NOTHING
  `;
}
