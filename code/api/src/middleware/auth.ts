import { createMiddleware } from "hono/factory";
import type { Env } from "../index.js";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = decodeJwt(token);
    if (!payload.sub) {
      return c.json({ error: "Invalid token: missing sub" }, 401);
    }
    c.set("cognitoSub", payload.sub);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

function decodeJwt(token: string): { sub: string; [key: string]: unknown } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf-8")
  );
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }
  return payload;
}
