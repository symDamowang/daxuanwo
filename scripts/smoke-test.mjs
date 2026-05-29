const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function cookieJar() {
  let cookie = "";

  return {
    async request(path, options = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          cookie,
          ...options.headers,
        },
      });

      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        cookie = setCookie
          .split(",")
          .map((item) => item.split(";")[0])
          .join("; ");
      }

      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const error = new Error(`${path} failed: ${response.status} ${text}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    },
  };
}

async function expectFailure(action, status, message) {
  try {
    await action();
  } catch (error) {
    assert(error.status === status, message);
    return error.data;
  }

  throw new Error(message);
}

const user = cookieJar();
const admin = cookieJar();
const stranger = cookieJar();
const suffix = Math.floor(Math.random() * 1_000_000_000);
const code = `smoke-${suffix}`;
const userAnswer = "像一条晚点的地铁，车厢里很亮，但没有人说话。";
const adminLetter = "有人在很远的地方停了一下，说：这句话有一点亮。";
const userReply = "那一点亮，大概是因为我还没有真的睡着。";

const page = await fetch(baseUrl).then((response) => response.text());
assert(page.includes("大漩涡"), "首页没有渲染中文项目名。");
assert(page.includes("把一句话丢进去"), "首页中文文案疑似乱码或缺失。");

await expectFailure(
  () =>
    stranger.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "nobody", password: "wrong" }),
    }),
  400,
  "错误登录没有被拒绝。"
);

const registered = await user.request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ code, password: "secret123" }),
});
assert(registered.user.code === code, "注册后的代号不正确。");

const promptResult = await user.request("/api/prompts/current");
assert(promptResult.prompt?.text, "没有拿到随机题目。");
assert(/[\u4e00-\u9fff]/.test(promptResult.prompt.text), "随机题目没有保留中文。");

await expectFailure(
  () => user.request("/api/admin/answers"),
  403,
  "普通用户不应进入管理员控制室。"
);

const answerResult = await user.request("/api/answers", {
  method: "POST",
  body: JSON.stringify({
    promptId: promptResult.prompt.id,
    content: userAnswer,
  }),
});
assert(answerResult.answer.content === userAnswer, "中文回答保存后不一致。");

await admin.request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ code: "admin", password: "admin123" }),
});

const adminAnswers = await admin.request("/api/admin/answers");
const createdAnswer = adminAnswers.answers.find((answer) => answer.id === answerResult.answer.id);
assert(createdAnswer, "管理员控制室没有看到新回答。");
assert(createdAnswer.content === userAnswer, "管理员控制室里的中文回答不一致。");

await admin.request("/api/admin/letters", {
  method: "POST",
  body: JSON.stringify({
    answerId: answerResult.answer.id,
    identity: "ECHO",
    body: adminLetter,
  }),
});

const inbox = await user.request("/api/letters");
assert(inbox.threads.length > 0, "用户没有收到管理员发出的信。");
assert(inbox.threads[0].latest.body === adminLetter, "来信中文内容不一致。");

const threadId = inbox.threads[0].id;

await expectFailure(
  () => stranger.request(`/api/letters/${threadId}`),
  401,
  "未登录用户不应看到信件详情。"
);

const thread = await user.request(`/api/letters/${threadId}`);
assert(
  thread.thread.letters.some((letter) => letter.body === adminLetter),
  "信件详情没有保留管理员中文来信。"
);

await user.request(`/api/letters/${threadId}`, {
  method: "POST",
  body: JSON.stringify({ body: userReply }),
});

const updatedThread = await user.request(`/api/letters/${threadId}`);
assert(
  updatedThread.thread.letters.some((letter) => letter.body === userReply),
  "用户中文回信没有保存。"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "首页中文",
        "随机题目中文",
        "用户中文回答",
        "管理员中文来信",
        "用户中文回信",
        "完整信箱闭环",
        "错误登录拒绝",
        "未登录信件拦截",
        "普通用户管理员拦截",
      ],
      user: code,
      prompt: promptResult.prompt.text,
      latest: adminLetter,
    },
    null,
    2
  )
);
