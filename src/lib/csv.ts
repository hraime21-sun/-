// CSV 내보내기. 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙이고,
// '=', '+', '-', '@' 로 시작하는 칸은 수식 실행(CSV 인젝션)을 막기 위해 앞에 ' 를 붙입니다.
import { challengeById, MAX_LEVEL } from "./challenges";
import type { Attempt, Student } from "./store";

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function fmt(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

export function attemptsCsv(students: Student[], attempts: Attempt[]): string {
  const byId = new Map(students.map((s) => [s.id, s]));
  const header = ["번호", "별명", "레벨", "그림", "라운드", "시도", "프롬프트", "점수", "통과기준", "통과", "찾은 요소", "피드백", "채점", "시각"];
  const rows = [...attempts]
    .sort((a, b) => (byId.get(a.studentId)?.number ?? 0) - (byId.get(b.studentId)?.number ?? 0) || a.createdAt - b.createdAt)
    .map((a) => {
      const s = byId.get(a.studentId);
      const c = challengeById(a.challengeId);
      const labels = c ? c.checklist.filter((i) => a.matched.includes(i.id)).map((i) => i.label).join(" / ") : "";
      return [s?.number ?? "", s?.nickname ?? "", a.level, c?.title ?? a.challengeId, a.round, a.tryNo, a.prompt, a.score, c?.passScore ?? "", a.passed ? "O" : "X", labels, a.feedback, a.scorer === "gemini" ? "AI" : "키워드", fmt(a.createdAt)];
    });
  return toCsv([header, ...rows]);
}

export function summaryCsv(students: Student[], attempts: Attempt[]): string {
  const header = ["번호", "별명", "현재 레벨", "완료", "총 시도", ...Array.from({ length: MAX_LEVEL }, (_, i) => `레벨${i + 1} 최고점`), "마지막 활동"];
  const rows = students.map((s) => {
    const mine = attempts.filter((a) => a.studentId === s.id);
    const best = Array.from({ length: MAX_LEVEL }, (_, i) => {
      const scores = mine.filter((a) => a.level === i + 1).map((a) => a.score);
      return scores.length ? Math.max(...scores) : "";
    });
    return [s.number, s.nickname, s.completedAt ? "완료" : s.level, s.completedAt ? "O" : "", mine.length, ...best, fmt(s.lastActiveAt)];
  });
  return toCsv([header, ...rows]);
}
