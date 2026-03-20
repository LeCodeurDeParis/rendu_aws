import { sql } from "../services/aws_rds.js";
import type { Task } from "../types/index.js";

export async function create(
  name: string,
  description: string | null,
  projectId: number,
  status: string = "todo",
  assigneeSub: string | null = null
): Promise<Task> {
  const [task] = await sql<Task[]>`
    INSERT INTO tasks (name, description, status, project_id, assignee_sub)
    VALUES (${name}, ${description}, ${status}, ${projectId}, ${assigneeSub})
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
  data: { name?: string; description?: string | null; status?: string; assignee_sub?: string | null }
): Promise<Task | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const name = data.name !== undefined ? data.name : existing.name;
  const description = data.description !== undefined ? data.description : existing.description;
  const status = data.status !== undefined ? data.status : existing.status;
  const assignee_sub = data.assignee_sub !== undefined ? data.assignee_sub : existing.assignee_sub;
  const [task] = await sql<Task[]>`
    UPDATE tasks SET
      name = ${name},
      description = ${description},
      status = ${status},
      assignee_sub = ${assignee_sub},
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
