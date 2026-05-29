import bcrypt from "bcryptjs";
import { createSession } from "@/app/lib/auth";
import { id, one, run } from "@/app/lib/db";
import { badRequest, json, readJson } from "@/app/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ code?: string; password?: string; email?: string }>(request);
  const code = body.code?.trim().toLowerCase();
  const password = body.password ?? "";
  const email = body.email?.trim() || null;

  if (!code || code.length < 3) return badRequest("代号至少需要 3 个字符。");
  if (!/^[a-z0-9-_.]+$/.test(code)) return badRequest("代号只能使用字母、数字、短横线、下划线或点。");
  if (password.length < 6) return badRequest("进入密钥至少需要 6 个字符。");

  const existing = await one("SELECT id FROM User WHERE code = ?", code);
  if (existing) return badRequest("这个代号已经被卷走了。");

  const userId = id();
  await run(
    "INSERT INTO User (id, code, passwordHash, email, role, status, createdAt) VALUES (?, ?, ?, ?, 'USER', 'ACTIVE', CURRENT_TIMESTAMP)",
    userId,
    code,
    await bcrypt.hash(password, 10),
    email
  );

  await createSession(userId);
  return json({ user: { code, role: "USER", email } });
}
