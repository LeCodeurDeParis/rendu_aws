import { createMiddleware } from "hono/factory";
import { cognito } from "@iim/domain";
import type { Env } from "../index.js";

export const adminMiddleware = createMiddleware<Env>(async (c, next) => {
  const sub = c.get("cognitoSub");
  const isAdminUser = await cognito.isAdmin(sub);
  if (!isAdminUser) {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
});
