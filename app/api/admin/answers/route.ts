import { getCurrentUser } from "@/app/lib/auth";
import { many, run } from "@/app/lib/db";
import { badRequest, json, readJson } from "@/app/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });

  const rows = await many<{
    id: string;
    content: string;
    status: string;
    createdAt: string;
    userCode: string;
    promptText: string;
  }>(
    "SELECT Answer.id, Answer.content, Answer.status, Answer.createdAt, User.code as \"userCode\", Prompt.text as \"promptText\" FROM Answer JOIN User ON User.id = Answer.userId JOIN Prompt ON Prompt.id = Answer.promptId ORDER BY Answer.createdAt DESC LIMIT 50"
  );

  return json({
    answers: rows.map((row) => ({
      id: row.id,
      content: row.content,
      status: row.status,
      createdAt: row.createdAt,
      user: { code: row.userCode },
      prompt: { text: row.promptText },
    })),
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });

  const body = await readJson<{ answerId?: string; status?: string }>(request);
  if (!body.answerId) return badRequest("缺少回答。");
  if (body.status !== "IGNORED") return badRequest("暂时只支持标记忽略。");

  await run("UPDATE Answer SET status = 'IGNORED' WHERE id = ?", body.answerId);
  return json({ ok: true });
}
