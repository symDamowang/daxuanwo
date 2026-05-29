"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "entry" | "vortex" | "waiting" | "inbox" | "letter" | "me" | "admin";
type Mode = "login" | "register";
type Role = "USER" | "ADMIN";

type Me = {
  code: string;
  role: Role;
  email: string | null;
  answerCount?: number;
};

type Prompt = {
  id: string;
  type: string;
  text: string;
  hint: string | null;
};

type Letter = {
  id: string;
  identity: string;
  body: string;
  authorId: string | null;
  recipientId: string;
  createdAt: string;
};

type ThreadSummary = {
  id: string;
  subject: string;
  updatedAt: string;
  latest: Letter | null;
};

type ThreadDetail = {
  id: string;
  subject: string;
  letters: Letter[];
};

type AdminAnswer = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  user: { code: string };
  prompt: { text: string };
};

const identityLabels: Record<string, string> = {
  ECHO: "回声",
  FOLLOW_UP: "追问",
  MISDELIVERED: "误投信",
  STRANGER: "匿名陌生人",
  VORTEX: "大漩涡",
  NIGHT_WATCHER: "值夜人",
  USER: "回信",
};

const promptLabels: Record<string, string> = {
  RANKING: "排行",
  FEELING: "感受",
  FRAGMENT: "碎片",
  QUESTION: "问题",
};

const identityOptions = [
  ["ECHO", "回声"],
  ["FOLLOW_UP", "追问"],
  ["MISDELIVERED", "误投信"],
  ["STRANGER", "匿名陌生人"],
  ["VORTEX", "大漩涡"],
  ["NIGHT_WATCHER", "值夜人"],
];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "水面短暂失灵了。");
  }
  return data;
}

function relativeTime(value?: string) {
  if (!value) return "刚刚漂来";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 5) return "刚刚漂来";
  if (minutes < 60) return "刚才";
  if (minutes < 60 * 24) return "今夜";
  if (minutes < 60 * 48) return "昨天";
  if (minutes < 60 * 24 * 7) return "前几天";
  return "很久以前";
}

export default function Home() {
  const [view, setView] = useState<View>("entry");
  const [mode, setMode] = useState<Mode>("login");
  const [me, setMe] = useState<Me | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [answer, setAnswer] = useState("");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [reply, setReply] = useState("");
  const [adminAnswers, setAdminAnswers] = useState<AdminAnswer[]>([]);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [identity, setIdentity] = useState("ECHO");
  const [adminLetter, setAdminLetter] = useState(
    "你刚刚写下的那句话，被漩涡带到了一间很安静的房间。有人停了一会儿，回了一句：我好像也有过这样的时刻。"
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedAnswer = useMemo(
    () => adminAnswers.find((item) => item.id === selectedAnswerId) ?? adminAnswers[0],
    [adminAnswers, selectedAnswerId]
  );

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (!me) return;
    if (view === "vortex") loadPrompt();
    if (view === "inbox") loadThreads();
    if (view === "admin" && me.role === "ADMIN") loadAdminAnswers();
  }, [me, view]);

  async function refreshMe() {
    const data = await api<{ user: Me | null }>("/api/me");
    setMe(data.user);
    if (data.user) setView("vortex");
  }

  async function loadPrompt() {
    const data = await api<{ prompt: Prompt | null }>("/api/prompts/current");
    setPrompt(data.prompt);
  }

  async function loadThreads() {
    const data = await api<{ threads: ThreadSummary[] }>("/api/letters");
    setThreads(data.threads);
  }

  async function loadThread(threadId: string) {
    const data = await api<{ thread: ThreadDetail }>(`/api/letters/${threadId}`);
    setThread(data.thread);
    setView("letter");
  }

  async function loadAdminAnswers() {
    const data = await api<{ answers: AdminAnswer[] }>("/api/admin/answers");
    setAdminAnswers(data.answers);
    setSelectedAnswerId((current) => current ?? data.answers[0]?.id ?? null);
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await api<{ user: Me }>(path, {
        method: "POST",
        body: JSON.stringify({ code, password, email: mode === "register" ? email : undefined }),
      });
      setMe(data.user);
      setCode("");
      setPassword("");
      setEmail("");
      setView("vortex");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "进入失败。");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!prompt || answer.trim().length === 0) return;
    setBusy(true);
    setNotice("");
    try {
      await api("/api/answers", {
        method: "POST",
        body: JSON.stringify({ promptId: prompt.id, content: answer }),
      });
      setAnswer("");
      await refreshMe();
      setView("waiting");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "没有沉下去。");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!thread || !reply.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      await api(`/api/letters/${thread.id}`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      await loadThread(thread.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "回信没有放走。");
    } finally {
      setBusy(false);
    }
  }

  async function updateEmail() {
    setBusy(true);
    setNotice("");
    try {
      const data = await api<{ user: Me }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ email }),
      });
      setMe({ ...data.user, answerCount: me?.answerCount });
      setNotice("邮箱已经绑上了。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "邮箱没有绑上。");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setMe(null);
    setView("entry");
  }

  async function sendAdminLetter() {
    if (!selectedAnswer || !adminLetter.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      await api("/api/admin/letters", {
        method: "POST",
        body: JSON.stringify({ answerId: selectedAnswer.id, identity, body: adminLetter }),
      });
      setNotice("信已经放进漩涡。");
      await loadAdminAnswers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "这封信没有发出去。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="watermark">大漩涡</div>
      <div className="current-ring" />
      <div className="grain" />

      {me && (
        <nav className="dock" aria-label="主导航">
          <button className={view === "vortex" || view === "waiting" ? "active" : ""} onClick={() => setView("vortex")}>
            漩涡
          </button>
          <button className={view === "inbox" || view === "letter" ? "active" : ""} onClick={() => setView("inbox")}>
            来信
          </button>
          <button className={view === "me" ? "active" : ""} onClick={() => setView("me")}>
            我
          </button>
          {me.role === "ADMIN" && (
            <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
              控制室
            </button>
          )}
        </nav>
      )}

      {view === "entry" && (
        <section className="entry-screen">
          <div className="brand-block">
            <p className="eyebrow">深夜漂流书信实验</p>
            <h1>大漩涡</h1>
            <p className="lead">把一句话丢进去，看看它会不会回来。</p>
          </div>

          <form className="auth-panel" onSubmit={handleAuth}>
            <div className="tabs">
              <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>
                进入
              </button>
              <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>
                注册
              </button>
            </div>
            <label>
              <span>代号</span>
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="比如 slow-light-33" />
            </label>
            <label>
              <span>进入密钥</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="不是手机号，也不必是真名" />
            </label>
            {mode === "register" && (
              <label>
                <span>可选邮箱</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="把你从漩涡里捞回来的绳子" />
              </label>
            )}
            <button className="primary" disabled={busy}>{busy ? "水面正在变化" : "进入漩涡"}</button>
            <p className="soft-note">管理员入口：代号 admin，密钥 admin123。上线前会换掉。</p>
            {notice && <p className="soft-note alert">{notice}</p>}
          </form>
        </section>
      )}

      {me && view === "vortex" && (
        <section className="focus-screen">
          <div className="prompt-card">
            <p className="eyebrow">{prompt ? promptLabels[prompt.type] ?? prompt.type : "等待"}</p>
            <h2>{prompt?.text ?? "暂时没有问题浮上来。"}</h2>
            <p className="hint">{prompt?.hint ?? "可以先去来信里看看。"}</p>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="写在这里。不要太正确，也不用太完整。"
            />
            <div className="actions">
              <button className="ghost" onClick={() => setAnswer("")}>清空水面</button>
              <button className="primary" onClick={submitAnswer} disabled={busy || !prompt}>让它下沉</button>
            </div>
            {notice && <p className="soft-note alert">{notice}</p>}
          </div>
        </section>
      )}

      {me && view === "waiting" && (
        <section className="focus-screen">
          <div className="waiting-state">
            <div className="slow-orbit" />
            <p className="eyebrow">已经丢入</p>
            <h2>它正在下沉。</h2>
            <p>还没有撞上任何人。水面暂时很安静，但下面不是空的。</p>
            <div className="actions center">
              <button className="ghost" onClick={() => setView("inbox")}>看看有没有来信</button>
              <button className="primary" onClick={() => setView("vortex")}>再领一个问题</button>
            </div>
          </div>
        </section>
      )}

      {me && view === "inbox" && (
        <section className="content-screen">
          <header className="section-head">
            <p className="eyebrow">漂来的东西</p>
            <h2>来信</h2>
          </header>
          <div className="letter-list">
            {threads.length === 0 && <p className="empty-note">暂时没有来信。它们可能还在路上。</p>}
            {threads.map((item) => (
              <button className="letter-card" key={item.id} onClick={() => loadThread(item.id)}>
                <span className="signal live" />
                <span>
                  <strong>{identityLabels[item.latest?.identity ?? "VORTEX"]}</strong>
                  <small>{relativeTime(item.latest?.createdAt)}</small>
                </span>
                <p>{item.latest?.body ?? item.subject}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {me && view === "letter" && thread && (
        <section className="content-screen narrow">
          <header className="section-head inline">
            <button className="back" onClick={() => setView("inbox")}>返回</button>
            <div>
              <p className="eyebrow">信件往来</p>
              <h2>{thread.subject}</h2>
            </div>
          </header>
          {thread.letters.map((letter) => (
            <article className={letter.authorId ? "mail mine" : "mail"} key={letter.id}>
              <p className="stamp">{identityLabels[letter.identity] ?? letter.identity} · {relativeTime(letter.createdAt)}</p>
              <p>{letter.body}</p>
            </article>
          ))}
          <textarea
            className="reply-box"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="写一封回信。它不一定马上回来。"
          />
          <div className="actions">
            <button className="ghost">举报/拉黑</button>
            <button className="primary" onClick={sendReply} disabled={busy}>把回信放走</button>
          </div>
          {notice && <p className="soft-note alert">{notice}</p>}
        </section>
      )}

      {me && view === "me" && (
        <section className="content-screen narrow">
          <header className="section-head">
            <p className="eyebrow">一个临时身份</p>
            <h2>我</h2>
          </header>
          <div className="settings-grid">
            <div>
              <span>代号</span>
              <strong>{me.code}</strong>
            </div>
            <div>
              <span>邮箱</span>
              <strong>{me.email ?? "还没有绑"}</strong>
            </div>
            <div>
              <span>已丢入</span>
              <strong>{me.answerCount ?? 0} 句话</strong>
            </div>
          </div>
          <label className="wide-label">
            <span>可选邮箱</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="把你从漩涡里捞回来的绳子" />
          </label>
          <div className="actions">
            <button className="ghost" onClick={logout}>退出</button>
            <button className="primary" onClick={updateEmail} disabled={busy}>绑定邮箱</button>
          </div>
          {notice && <p className="soft-note alert">{notice}</p>}
        </section>
      )}

      {me?.role === "ADMIN" && view === "admin" && (
        <section className="admin-screen">
          <header className="section-head">
            <p className="eyebrow">管理员</p>
            <h2>漩涡控制室</h2>
          </header>
          <div className="control-grid">
            <div className="answer-queue">
              {adminAnswers.length === 0 && <p className="empty-note">还没有新的回答。</p>}
              {adminAnswers.map((item) => (
                <button
                  className={item.id === selectedAnswer?.id ? "answer-row selected-row" : "answer-row"}
                  key={item.id}
                  onClick={() => setSelectedAnswerId(item.id)}
                >
                  <span>
                    <strong>{item.user.code}</strong>
                    <small>{item.prompt.text}</small>
                  </span>
                  <p>{item.content}</p>
                  <em>{item.status === "REPLIED" ? "已回复" : item.status === "IGNORED" ? "已忽略" : "未处理"}</em>
                </button>
              ))}
            </div>
            <div className="compose-panel">
              <label>
                <span>发信身份</span>
                <select value={identity} onChange={(event) => setIdentity(event.target.value)}>
                  {identityOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>信件内容</span>
                <textarea value={adminLetter} onChange={(event) => setAdminLetter(event.target.value)} />
              </label>
              <div className="actions">
                <button className="ghost">标记忽略</button>
                <button className="primary" onClick={sendAdminLetter} disabled={busy || !selectedAnswer}>发出这封信</button>
              </div>
              {notice && <p className="soft-note alert">{notice}</p>}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
