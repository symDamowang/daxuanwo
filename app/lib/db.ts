import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";

const globalForDb = globalThis as unknown as {
  daxuanwoDb?: DatabaseSync;
};

export const db =
  globalForDb.daxuanwoDb ??
  new DatabaseSync(path.join(process.cwd(), "prisma", "dev.db"));

if (process.env.NODE_ENV !== "production") {
  globalForDb.daxuanwoDb = db;
}

export function id() {
  return `cm_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function one<T extends object>(sql: string, ...values: SQLInputValue[]) {
  return db.prepare(sql).get(...values) as T | undefined;
}

export function many<T extends object>(sql: string, ...values: SQLInputValue[]) {
  return db.prepare(sql).all(...values) as T[];
}

export function run(sql: string, ...values: SQLInputValue[]) {
  return db.prepare(sql).run(...values);
}
