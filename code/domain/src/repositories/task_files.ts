import { sql } from "../services/aws_rds.js";
import type { TaskFile } from "../types/index.js";

export async function create(
  taskId: number,
  fileName: string,
  s3Key: string,
  contentType: string,
  uploadedBySub: string
): Promise<TaskFile> {
  const [file] = await sql<TaskFile[]>`
    INSERT INTO task_files (task_id, file_name, s3_key, content_type, uploaded_by_sub)
    VALUES (${taskId}, ${fileName}, ${s3Key}, ${contentType}, ${uploadedBySub})
    RETURNING *
  `;
  return file;
}

export async function findByTask(taskId: number): Promise<TaskFile[]> {
  return sql<TaskFile[]>`
    SELECT * FROM task_files WHERE task_id = ${taskId} ORDER BY created_at DESC
  `;
}

export async function findById(id: number): Promise<TaskFile | null> {
  const [file] = await sql<TaskFile[]>`SELECT * FROM task_files WHERE id = ${id}`;
  return file ?? null;
}

export async function remove(id: number): Promise<void> {
  await sql`DELETE FROM task_files WHERE id = ${id}`;
}
