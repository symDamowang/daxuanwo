import { getCurrentUser } from "@/app/lib/auth";
import { many, one } from "@/app/lib/db";
import { json } from "@/app/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const threads = await many<{ id: string; subject: string; updatedAt: string }>(
    "SELECT LetterThread.* FROM LetterThread JOIN ThreadMember ON ThreadMember.threadId = LetterThread.id WHERE ThreadMember.userId = ? ORDER BY LetterThread.updatedAt DESC",
    user.id
  );

  const summaries = await Promise.all(
    threads.map(async (thread) => ({
      id: thread.id,
      subject: thread.subject,
      updatedAt: thread.updatedAt,
      latest:
        await one(
          "SELECT * FROM Letter WHERE threadId = ? ORDER BY createdAt DESC LIMIT 1",
          thread.id
        ) ?? null,
    }))
  );

  return json({ threads: summaries });
}
