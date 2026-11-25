import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "그림 보고 말해요 · 프롬프트 교실",
  description: "그림을 보고 설명하며 AI 프롬프트를 연습해요.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
