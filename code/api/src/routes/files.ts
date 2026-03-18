import { Hono } from "hono";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { taskFilesRepo, tasksRepo, projectsRepo, teamsRepo } from "@iim/domain";
import type { Env } from "../index.js";

export const filesRoutes = new Hono<Env>();

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-1" });
const BUCKET = process.env.S3_FILES_BUCKET ?? "trellu-files";

filesRoutes.post("/tasks/:taskId", async (c) => {
  const sub = c.get("cognitoSub");
  const taskId = Number(c.req.param("taskId"));

  const task = await tasksRepo.findById(taskId);
  if (!task) return c.json({ error: "Task not found" }, 404);
  const project = await projectsRepo.findById(task.project_id);
  if (!project) return c.json({ error: "Project not found" }, 404);
  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const { fileName, contentType } = await c.req.json<{ fileName: string; contentType: string }>();
  const s3Key = `tasks/${taskId}/${Date.now()}_${fileName}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: contentType }),
    { expiresIn: 300 }
  );

  const file = await taskFilesRepo.create(taskId, fileName, s3Key, contentType, sub);
  return c.json({ file, uploadUrl }, 201);
});

filesRoutes.get("/tasks/:taskId", async (c) => {
  const sub = c.get("cognitoSub");
  const taskId = Number(c.req.param("taskId"));

  const task = await tasksRepo.findById(taskId);
  if (!task) return c.json({ error: "Task not found" }, 404);
  const project = await projectsRepo.findById(task.project_id);
  if (!project) return c.json({ error: "Project not found" }, 404);
  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  const files = await taskFilesRepo.findByTask(taskId);
  return c.json(files);
});

filesRoutes.delete("/:id", async (c) => {
  const sub = c.get("cognitoSub");
  const id = Number(c.req.param("id"));
  const file = await taskFilesRepo.findById(id);
  if (!file) return c.json({ error: "File not found" }, 404);

  const task = await tasksRepo.findById(file.task_id);
  if (!task) return c.json({ error: "Task not found" }, 404);
  const project = await projectsRepo.findById(task.project_id);
  if (!project) return c.json({ error: "Project not found" }, 404);
  const isMember = await teamsRepo.isMember(project.team_id, sub);
  if (!isMember) return c.json({ error: "Not a member of this team" }, 403);

  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
  await taskFilesRepo.remove(id);
  return c.json({ message: "File deleted" });
});
