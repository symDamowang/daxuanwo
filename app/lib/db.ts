import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { Pool } from "pg";
import crypto from "node:crypto";
import path from "node:path";

const globalForDb = globalThis as unknown as {
  daxuanwoDb?: DatabaseSync;
  daxuanwoPool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

const sqliteDb =
  globalForDb.daxuanwoDb ??
  (isPostgres ? undefined : new DatabaseSync(path.join(process.cwd(), "prisma", "dev.db")));

const pgPool =
  globalForDb.daxuanwoPool ??
  (isPostgres
    ? new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
      })
    : undefined);

if (process.env.NODE_ENV !== "production") {
  if (sqliteDb) globalForDb.daxuanwoDb = sqliteDb;
  if (pgPool) globalForDb.daxuanwoPool = pgPool;
}

export function id() {
  return `cm_${crypto.randomUUID().replaceAll("-", "")}`;
}

function postgresSql(sql: string) {
  const quoted = [
    "User",
    "Session",
    "Prompt",
    "Answer",
    "LetterThread",
    "ThreadMember",
    "Letter",
    "passwordHash",
    "createdAt",
    "expiresAt",
    "updatedAt",
    "userId",
    "promptId",
    "answerId",
    "threadId",
    "recipientId",
    "authorId",
    "readAt",
  ].reduce(
    (current, name) => current.replace(new RegExp(`\\b${name}\\b`, "g"), `"${name}"`),
    sql
  );
  let index = 0;
  return quoted.replaceAll("?", () => `$${++index}`);
}

export async function one<T extends object>(sql: string, ...values: SQLInputValue[]) {
  if (pgPool) {
    const result = await pgPool.query(postgresSql(sql), values);
    return result.rows[0] as T | undefined;
  }

  return sqliteDb!.prepare(sql).get(...values) as T | undefined;
}

export async function many<T extends object>(sql: string, ...values: SQLInputValue[]) {
  if (pgPool) {
    const result = await pgPool.query(postgresSql(sql), values);
    return result.rows as T[];
  }

  return sqliteDb!.prepare(sql).all(...values) as T[];
}

export async function run(sql: string, ...values: SQLInputValue[]) {
  if (pgPool) {
    return pgPool.query(postgresSql(sql), values);
  }

  return sqliteDb!.prepare(sql).run(...values);
}
