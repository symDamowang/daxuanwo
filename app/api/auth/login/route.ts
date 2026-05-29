import bcrypt from "bcryptjs";
import { createSession } from "@/app/lib/auth";
import { one } from "@/app/lib/db";
import { badRequest, json, readJson } from "@/app/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ code?: string; password?: string }>(request);
  const code = body.code?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!code || !password) return badRequest("需要代号和进入密钥。");

  const user = await one<{
    id: string;
    code: string;
    passwordHash: string;
    email: string | null;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "DISABLED";
  }>("SELECT * FROM User WHERE code = ?", code);
  if (!user || user.status !== "ACTIVE") return badRequest("没有找到这个代号。");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return badRequest("进入密钥不对。");

  await createSession(user.id);
  return json({ user: { code: user.code, role: user.role, email: user.email } });
}
