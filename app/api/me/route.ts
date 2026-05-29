import { getCurrentUser } from "@/app/lib/auth";
import { one, run } from "@/app/lib/db";
import { json } from "@/app/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ user: null });

  const count = one<{ count: number }>("SELECT COUNT(*) as count FROM Answer WHERE userId = ?", user.id);

  return json({
    user: {
      code: user.code,
      role: user.role,
      email: user.email,
      answerCount: count?.count ?? 0,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim() || null;
  run("UPDATE User SET email = ? WHERE id = ?", email, user.id);

  return json({ user: { code: user.code, role: user.role, email } });
}
