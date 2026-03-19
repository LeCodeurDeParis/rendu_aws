import { Hono } from "hono";
import { cognito } from "@iim/domain";
import type { Env } from "../index.js";

export const usersRoutes = new Hono<Env>();

usersRoutes.get("/me", async (c) => {
  const sub = c.get("cognitoSub");
  const user = await cognito.getUserBySub(sub);
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});

usersRoutes.put("/me", async (c) => {
  const sub = c.get("cognitoSub");
  const body = await c.req.json<{ name?: string }>();
  await cognito.updateUserBySub(sub, body);
  const user = await cognito.getUserBySub(sub);
  return c.json(user);
});
