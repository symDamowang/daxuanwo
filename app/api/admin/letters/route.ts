import { getCurrentUser } from "@/app/lib/auth";
import { id, one, run } from "@/app/lib/db";
import { badRequest, json, readJson } from "@/app/lib/http";

const identities = new Set(["ECHO", "FOLLOW_UP", "MISDELIVERED", "STRANGER", "VORTEX", "NIGHT_WATCHER"]);

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) return json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const body = await readJson<{ answerId?: string; identity?: string; body?: string }>(request);
  const content = body.body?.trim();

  if (!body.answerId) return badRequest("缺少回答。");
  if (!content) return badRequest("信件内容不能为空。");
  if (!body.identity || !identities.has(body.identity)) return badRequest("发信身份不对。");

  const answer = await one<{ id: string; userId: string }>("SELECT * FROM Answer WHERE id = ?", body.answerId);
  if (!answer) return json({ error: "Not found" }, { status: 404 });

  const threadId = id();
  const letterId = id();
  await run(
    "INSERT INTO LetterThread (id, answerId, subject, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    threadId,
    answer.id,
    "关于你丢进漩涡的那句话"
  );
  await run("INSERT INTO ThreadMember (id, threadId, userId) VALUES (?, ?, ?)", id(), threadId, answer.userId);
  await run("INSERT INTO ThreadMember (id, threadId, userId) VALUES (?, ?, ?)", id(), threadId, admin.id);
  await run(
    "INSERT INTO Letter (id, threadId, recipientId, authorId, identity, body, createdAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    letterId,
    threadId,
    answer.userId,
    admin.id,
    body.identity,
    content
  );

  await run("UPDATE Answer SET status = 'REPLIED' WHERE id = ?", answer.id);

  return json({ thread: { id: threadId } });
}
