CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Prompt" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  text TEXT NOT NULL UNIQUE,
  hint TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  weight INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Answer" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "promptId" TEXT NOT NULL REFERENCES "Prompt"(id),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "LetterThread" (
  id TEXT PRIMARY KEY,
  "answerId" TEXT REFERENCES "Answer"(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ThreadMember" (
  id TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL REFERENCES "LetterThread"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("threadId", "userId")
);

CREATE TABLE IF NOT EXISTS "Letter" (
  id TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL REFERENCES "LetterThread"(id) ON DELETE CASCADE,
  "recipientId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "authorId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  identity TEXT NOT NULL,
  body TEXT NOT NULL,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Answer_userId_idx" ON "Answer"("userId");
CREATE INDEX IF NOT EXISTS "Letter_recipientId_idx" ON "Letter"("recipientId");

INSERT INTO "Prompt" (id, type, text, hint, enabled, weight)
VALUES
  ('prompt_ranking_001', 'RANKING', '列出三部你不敢随便推荐给熟人的电影。', '不用解释得太完整，留下排序就可以。', true, 1),
  ('prompt_feeling_001', 'FEELING', '写下你现在真实的精神天气。', '可以是一句话、一个词，或者一段不太讲理的描述。', true, 1),
  ('prompt_fragment_001', 'FRAGMENT', '留下一句你差点发出去、最后又删掉的话。', '不必交代前因后果。', true, 1),
  ('prompt_question_001', 'QUESTION', '如果今晚只能保留一个念头，你会留下哪一个？', '别急着写漂亮答案。', true, 1)
ON CONFLICT (text) DO NOTHING;

INSERT INTO "User" (id, code, "passwordHash", role, status)
VALUES ('admin_user_001', 'admin', '$2b$10$btUeFIi5Y.aAMoPNURECVeQgTBJjqKXTJlCQZ.KEotu9x/gEUys8G', 'ADMIN', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;
