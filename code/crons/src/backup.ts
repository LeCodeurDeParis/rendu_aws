import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { sql, backupsRepo } from "@iim/domain";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
const BUCKET = process.env.S3_BACKUPS_BUCKET ?? "trellu-backups";

export async function backup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_${timestamp}.sql`;
  const s3Key = `backups/${fileName}`;

  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_migrations'
  `;

  let dump = `-- Trellu Database Backup\n-- Date: ${now.toISOString()}\n\n`;

  for (const { tablename } of tables) {
    const rows = await sql`SELECT * FROM ${sql(tablename)}`;
    if (rows.length === 0) continue;

    dump += `-- Table: ${tablename}\n`;
    for (const row of rows) {
      const columns = Object.keys(row).join(", ");
      const values = Object.values(row)
        .map((v) => (v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`))
        .join(", ");
      dump += `INSERT INTO ${tablename} (${columns}) VALUES (${values});\n`;
    }
    dump += "\n";
  }

  const buffer = Buffer.from(dump, "utf-8");

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: "application/sql",
    })
  );

  const backupRecord = await backupsRepo.create(fileName, s3Key, buffer.byteLength);
  return backupRecord;
}
