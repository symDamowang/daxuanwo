import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "大漩涡",
  description: "一个靠随机问题和陌生回信驱动的无聊青年交友游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
