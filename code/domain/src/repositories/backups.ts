import { sql } from "../services/aws_rds.js";
import type { Backup } from "../types/index.js";

export async function create(fileName: string, s3Key: string, size: number): Promise<Backup> {
  const [backup] = await sql<Backup[]>`
    INSERT INTO backups (file_name, s3_key, size)
    VALUES (${fileName}, ${s3Key}, ${size})
    RETURNING *
  `;
  return backup;
}

export async function findAll(): Promise<Backup[]> {
  return sql<Backup[]>`SELECT * FROM backups ORDER BY created_at DESC`;
}
