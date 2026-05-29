import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const db = new DatabaseSync("prisma/dev.db");

db.exec(`
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Prompt (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  text TEXT NOT NULL UNIQUE,
  hint TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  weight INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Answer (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL,
  promptId TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (promptId) REFERENCES Prompt(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS LetterThread (
  id TEXT PRIMARY KEY NOT NULL,
  answerId TEXT,
  subject TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (answerId) REFERENCES Answer(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ThreadMember (
  id TEXT PRIMARY KEY NOT NULL,
  threadId TEXT NOT NULL,
  userId TEXT NOT NULL,
  FOREIGN KEY (threadId) REFERENCES LetterThread(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ThreadMember_threadId_userId_key ON ThreadMember(threadId, userId);

CREATE TABLE IF NOT EXISTS Letter (
  id TEXT PRIMARY KEY NOT NULL,
  threadId TEXT NOT NULL,
  recipientId TEXT NOT NULL,
  authorId TEXT,
  identity TEXT NOT NULL,
  body TEXT NOT NULL,
  readAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (threadId) REFERENCES LetterThread(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (authorId) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS Session_userId_idx ON Session(userId);
CREATE INDEX IF NOT EXISTS Answer_userId_idx ON Answer(userId);
CREATE INDEX IF NOT EXISTS Letter_recipientId_idx ON Letter(recipientId);
`);

const id = () => `cm_${crypto.randomUUID().replaceAll("-", "")}`;

const prompts = [
  ["RANKING", "列出三部你不敢随便推荐给熟人的电影。", "不用解释得太完整，留下排序就可以。"],
  ["FEELING", "写下你现在真实的精神天气。", "可以是一句话、一个词，或者一段不太讲理的描述。"],
  ["FRAGMENT", "留下一句你差点发出去、最后又删掉的话。", "不必交代前因后果。"],
  ["QUESTION", "如果今晚只能保留一个念头，你会留下哪一个？", "别急着写漂亮答案。"],
];

const insertPrompt = db.prepare(
  "INSERT OR IGNORE INTO Prompt (id, type, text, hint, enabled, weight, createdAt) VALUES (?, ?, ?, ?, true, 1, CURRENT_TIMESTAMP)"
);
for (const prompt of prompts) {
  insertPrompt.run(id(), ...prompt);
}

const admin = db.prepare("SELECT id FROM User WHERE code = ?").get("admin");
if (!admin) {
  db.prepare(
    "INSERT INTO User (id, code, passwordHash, role, status, createdAt) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run(id(), "admin", await bcrypt.hash("admin123", 10));
}

db.close();
