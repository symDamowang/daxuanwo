import { getCurrentUser } from "@/app/lib/auth";
import { many } from "@/app/lib/db";
import { json } from "@/app/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const prompts = await many<{ id: string; type: string; text: string; hint: string | null; weight: number }>(
    "SELECT * FROM Prompt WHERE enabled = true"
  );
  if (prompts.length === 0) return json({ prompt: null });

  const pool = prompts.flatMap((prompt) => Array.from({ length: prompt.weight }, () => prompt));
  const prompt = pool[Math.floor(Math.random() * pool.length)];

  return json({ prompt });
}
