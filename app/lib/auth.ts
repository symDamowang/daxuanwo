import { cookies } from "next/headers";
import crypto from "node:crypto";
import { id, one, run } from "./db";

const sessionCookie = "daxuanwo_session";
const sessionDays = 30;

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await run(
    "INSERT INTO Session (id, token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
    id(),
    token,
    userId,
    expiresAt.toISOString()
  );

  const store = await cookies();
  store.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;

  if (token) {
    await run("DELETE FROM Session WHERE token = ?", token);
  }

  store.delete(sessionCookie);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;

  if (!token) return null;

  const session = await one<{
    expiresAt: string;
    id: string;
    code: string;
    passwordHash: string;
    email: string | null;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "DISABLED";
    createdAt: string;
  }>(
    "SELECT Session.expiresAt, User.* FROM Session JOIN User ON User.id = Session.userId WHERE Session.token = ?",
    token
  );

  if (!session || new Date(session.expiresAt) < new Date() || session.status !== "ACTIVE") {
    return null;
  }

  return session;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
