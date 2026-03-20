import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/aws-lambda";
import { authMiddleware } from "./middleware/auth.js";
import { usersRoutes } from "./routes/users.js";
import { teamsRoutes } from "./routes/teams.js";
import { invitationsRoutes } from "./routes/invitations.js";
import { projectsRoutes } from "./routes/projects.js";
import { tasksRoutes } from "./routes/tasks.js";
import { filesRoutes } from "./routes/files.js";
import { adminRoutes } from "./routes/admin.js";

export type Env = {
  Variables: {
    cognitoSub: string;
  };
};

const app = new Hono<Env>();

app.use(
  "*",
  cors({
    origin: [
      "https://d3g175w85dokrw.cloudfront.net",
      "http://localhost:3000",
      "https://d17hlbjx83nygp.cloudfront.net",
      "https://d31c8aryhjt7f7.cloudfront.net",
      "https://diznqc3cq5ktn.cloudfront.net",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["*"],
    credentials: true,
    exposeHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);
app.use("*", logger());

app.get("/", (c) => c.json({ message: "API Trellu" }));

app.use("/users/*", authMiddleware);
app.use("/teams/*", authMiddleware);
app.use("/invitations/*", authMiddleware);
app.use("/projects/*", authMiddleware);
app.use("/tasks/*", authMiddleware);
app.use("/files/*", authMiddleware);
app.use("/admin/*", authMiddleware);

app.route("/users", usersRoutes);
app.route("/teams", teamsRoutes);
app.route("/invitations", invitationsRoutes);
app.route("/projects", projectsRoutes);
app.route("/tasks", tasksRoutes);
app.route("/files", filesRoutes);
app.route("/admin", adminRoutes);

// Lambda handler
export const handler = handle(app);

// Dev server
if (typeof Bun !== "undefined") {
  const port = Number(process.env.PORT) || 4000;
  Bun.serve({ port, fetch: app.fetch });
  console.log(`API running on http://localhost:${port}`);
}
