import { clearSession } from "@/app/lib/auth";
import { json } from "@/app/lib/http";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}
