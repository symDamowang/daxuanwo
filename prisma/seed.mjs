import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const prompts = [
  {
    type: "RANKING",
    text: "列出三部你不敢随便推荐给熟人的电影。",
    hint: "不用解释得太完整，留下排序就可以。",
  },
  {
    type: "FEELING",
    text: "写下你现在真实的精神天气。",
    hint: "可以是一句话、一个词，或者一段不太讲理的描述。",
  },
  {
    type: "FRAGMENT",
    text: "留下一句你差点发出去、最后又删掉的话。",
    hint: "不必交代前因后果。",
  },
  {
    type: "QUESTION",
    text: "如果今晚只能保留一个念头，你会留下哪一个？",
    hint: "别急着写漂亮答案。",
  },
];

async function main() {
  for (const prompt of prompts) {
    await prisma.prompt.upsert({
      where: { text: prompt.text },
      update: prompt,
      create: prompt,
    });
  }

  await prisma.user.upsert({
    where: { code: "admin" },
    update: { role: "ADMIN" },
    create: {
      code: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
