import { sql } from "../services/aws_rds.js";
import type { Project } from "../types/index.js";

export async function create(name: string, description: string | null, teamId: number): Promise<Project> {
  const [project] = await sql<Project[]>`
    INSERT INTO projects (name, description, team_id)
    VALUES (${name}, ${description}, ${teamId})
    RETURNING *
  `;
  return project;
}

export async function findById(id: number): Promise<Project | null> {
  const [project] = await sql<Project[]>`SELECT * FROM projects WHERE id = ${id}`;
  return project ?? null;
}

export async function findByTeam(teamId: number): Promise<Project[]> {
  return sql<Project[]>`
    SELECT * FROM projects WHERE team_id = ${teamId} ORDER BY created_at DESC
  `;
}

export async function update(
  id: number,
  data: { name?: string; description?: string | null }
): Promise<Project | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const name = data.name !== undefined ? data.name : existing.name;
  const description = data.description !== undefined ? data.description : existing.description;
  const [project] = await sql<Project[]>`
    UPDATE projects SET
      name = ${name},
      description = ${description},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return project;
}

export async function remove(id: number): Promise<void> {
  await sql`DELETE FROM projects WHERE id = ${id}`;
}
