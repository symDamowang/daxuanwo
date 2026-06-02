import { one } from "@/app/lib/db";
import { json } from "@/app/lib/http";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const isPostgres =
    process.env.DATABASE_URL?.startsWith("postgres://") ||
    process.env.DATABASE_URL?.startsWith("postgresql://");

  try {
    const prompts = await one<{ count: number }>('SELECT COUNT(*) as count FROM Prompt');

    return json({
      ok: true,
      database: isPostgres ? "postgres" : "sqlite",
      hasDatabaseUrl,
      promptCount: Number(prompts?.count ?? 0),
    });
  } catch (error) {
    return json(
      {
        ok: false,
        database: isPostgres ? "postgres" : "sqlite",
        hasDatabaseUrl,
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 }
    );
  }
}
