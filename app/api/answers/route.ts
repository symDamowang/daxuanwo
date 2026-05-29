import { getCurrentUser } from "@/app/lib/auth";
import { id, one, run } from "@/app/lib/db";
import { badRequest, json, readJson } from "@/app/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJson<{ promptId?: string; content?: string }>(request);
  const content = body.content?.trim();

  if (!body.promptId) return badRequest("缺少问题。");
  if (!content || content.length < 2) return badRequest("至少留下一点东西。");

  const answerId = id();
  await run(
    "INSERT INTO Answer (id, userId, promptId, content, status, createdAt) VALUES (?, ?, ?, ?, 'NEW', CURRENT_TIMESTAMP)",
    answerId,
    user.id,
    body.promptId,
    content
  );
  const answer = await one("SELECT * FROM Answer WHERE id = ?", answerId);

  return json({ answer });
}
