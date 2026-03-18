import { sql } from "../services/aws_rds.js";
import type { Task } from "../types/index.js";

export async function create(
  name: string,
  description: string | null,
  projectId: number
): Promise<Task> {
  const [task] = await sql<Task[]>`
    INSERT INTO tasks (name, description, status, project_id)
    VALUES (${name}, ${description}, 'todo', ${projectId})
    RETURNING *
  `;
  return task;
}

export async function findById(id: number): Promise<Task | null> {
  const [task] = await sql<Task[]>`SELECT * FROM tasks WHERE id = ${id}`;
  return task ?? null;
}

export async function findByProject(projectId: number): Promise<Task[]> {
  return sql<Task[]>`
    SELECT * FROM tasks WHERE project_id = ${projectId} ORDER BY created_at ASC
  `;
}

export async function update(
  id: number,
  data: { name?: string; description?: string; status?: string; assignee_sub?: string | null }
): Promise<Task> {
  const [task] = await sql<Task[]>`
    UPDATE tasks SET
      name = COALESCE(${data.name ?? null}, name),
      description = COALESCE(${data.description ?? null}, description),
      status = COALESCE(${data.status ?? null}, status),
      assignee_sub = COALESCE(${data.assignee_sub ?? null}, assignee_sub),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return task;
}

export async function remove(id: number): Promise<void> {
  await sql`DELETE FROM tasks WHERE id = ${id}`;
}

export async function countAll(): Promise<number> {
  const [row] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM tasks`;
  return parseInt(row.count, 10);
}
