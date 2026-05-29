import { getCurrentUser } from "@/app/lib/auth";
import { id, many, one, run } from "@/app/lib/db";
import { badRequest, json, readJson } from "@/app/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { threadId } = await context.params;

  const member = await one("SELECT id FROM ThreadMember WHERE threadId = ? AND userId = ?", threadId, user.id);
  if (!member && user.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });

  const thread = await one<{ id: string; subject: string }>("SELECT * FROM LetterThread WHERE id = ?", threadId);

  if (!thread) return json({ error: "Not found" }, { status: 404 });
  return json({
    thread: {
      ...thread,
      letters: await many("SELECT * FROM Letter WHERE threadId = ? ORDER BY createdAt ASC", threadId),
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { threadId } = await context.params;
  const body = await readJson<{ body?: string }>(request);
  const content = body.body?.trim();

  if (!content) return badRequest("回信不能为空。");

  const members = await many<{ userId: string }>("SELECT userId FROM ThreadMember WHERE threadId = ?", threadId);
  const isMember = members.some((member) => member.userId === user.id);
  if (!isMember && user.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });

  const recipient = members.find((member) => member.userId !== user.id) ?? members[0];
  if (!recipient) return badRequest("这条信道没有收信人。");

  const letterId = id();
  await run(
    "INSERT INTO Letter (id, threadId, recipientId, authorId, identity, body, createdAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    letterId,
    threadId,
    recipient.userId,
    user.id,
    user.role === "ADMIN" ? "NIGHT_WATCHER" : "USER",
    content
  );

  await run("UPDATE LetterThread SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?", threadId);

  const letter = await one("SELECT * FROM Letter WHERE id = ?", letterId);
  return json({ letter });
}
