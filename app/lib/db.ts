import { Pool } from "pg";
import crypto from "node:crypto";
import path from "node:path";

type DbValue = string | number | bigint | boolean | null | Uint8Array;

type SqliteDatabase = {
  prepare(sql: string): {
    get(...values: DbValue[]): unknown;
    all(...values: DbValue[]): unknown[];
    run(...values: DbValue[]): unknown;
  };
};

const globalForDb = globalThis as unknown as {
  daxuanwoDb?: SqliteDatabase;
  daxuanwoPool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

const pgPool =
  globalForDb.daxuanwoPool ??
  (isPostgres
    ? new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
      })
    : undefined);

if (process.env.NODE_ENV !== "production") {
  if (pgPool) globalForDb.daxuanwoPool = pgPool;
}

export function id() {
  return `cm_${crypto.randomUUID().replaceAll("-", "")}`;
}

async function getSqliteDb() {
  if (globalForDb.daxuanwoDb) return globalForDb.daxuanwoDb;

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.join(process.cwd(), "prisma", "dev.db")) as SqliteDatabase;

  if (process.env.NODE_ENV !== "production") {
    globalForDb.daxuanwoDb = db;
  }

  return db;
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

export async function one<T extends object>(sql: string, ...values: DbValue[]) {
  if (pgPool) {
    const result = await pgPool.query(postgresSql(sql), values);
    return result.rows[0] as T | undefined;
  }

  const db = await getSqliteDb();
  return db.prepare(sql).get(...values) as T | undefined;
}

export async function many<T extends object>(sql: string, ...values: DbValue[]) {
  if (pgPool) {
    const result = await pgPool.query(postgresSql(sql), values);
    return result.rows as T[];
  }

  const db = await getSqliteDb();
  return db.prepare(sql).all(...values) as T[];
}

export async function run(sql: string, ...values: DbValue[]) {
  if (pgPool) {
    return pgPool.query(postgresSql(sql), values);
  }

  const db = await getSqliteDb();
  return db.prepare(sql).run(...values);
}
