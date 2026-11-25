import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as store from "@/lib/store";
import { progressFor, submitAttempt } from "@/lib/game";
import { attemptsCsv, csvCell, summaryCsv } from "@/lib/csv";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ppc-test-"));
process.env.DATA_FILE = path.join(dir, "db.json");

beforeEach(() => {
  fs.rmSync(process.env.DATA_FILE!, { force: true });
  store.resetStoreCache();
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function newStudent(n = 1, nick = "별") {
  const c = store.createClass("테스트반");
  const r = store.joinStudent(c.id, n, nick);
  if (!r.ok) throw new Error(r.reason);
  return { c, s: r.student };
}
const fresh = (id: string) => store.getStudent(id)!;

describe("게임 진행", () => {
  it("통과하면 다음 레벨로", async () => {
    const { s } = newStudent();
    const r = await submitAttempt(s, "하얀 배경에 초록 잎이 달린 빨간 사과");
    expect(r.ok && r.passed && r.levelUp).toBe(true);
    expect(fresh(s.id).level).toBe(2);
  });

  it("3번 실패하면 새 라운드가 시작되고 힌트가 열린다", async () => {
    const { s } = newStudent();
    for (let i = 0; i < 3; i++) await submitAttempt(fresh(s.id), "무언가 있어요");
    const p = progressFor(fresh(s.id));
    expect(p.round).toBe(2);
    expect(p.triesUsed).toBe(0);
    expect(p.revealedHints).toHaveLength(1);
    expect(p.revealedHints[0]).toContain("사과");
  });

  it("수업이 잠기면 제출 불가", async () => {
    const { c, s } = newStudent();
    store.updateClass(c.id, { locked: true });
    const r = await submitAttempt(s, "빨간 사과");
    expect(r.ok).toBe(false);
  });

  it("AI 채점 결과는 키워드 결과와 합쳐지고, AI 가 실패하면 키워드로 대신", async () => {
    const { s } = newStudent();
    const r1 = await submitAttempt(s, "동그란 물건에 잎사귀", async () => ({ matched: ["bg"], tip: "🍎 잎도 보이나요?" }));
    expect(r1.ok && r1.attempt.scorer).toBe("gemini");
    expect(r1.ok && r1.attempt.matched.sort()).toEqual(["bg", "leaf"]);
    expect(r1.ok && r1.passed).toBe(false);
    expect(r1.ok && r1.attempt.feedback).toBe("🍎 잎도 보이나요?");

    const r2 = await submitAttempt(fresh(s.id), "빨간 사과", async () => null);
    expect(r2.ok && r2.attempt.scorer).toBe("keyword");
  });

  it("5레벨을 모두 통과하면 완료", async () => {
    const { s } = newStudent();
    const answers = [
      "하얀 배경에 초록 잎이 달린 빨간 사과",
      "하늘에 파란 풍선 세 개가 구름 옆에 떠 있어요",
      "나무 탁자 위에 김이 나는 노란 컵이 있고 옆에 초록 책이 있어요",
      "공원 잔디밭에서 빨간 옷을 입은 아이가 연을 날리고 있고 나무와 해가 있어요",
      "별이 빛나는 밤 바다 옆 등대가 불빛을 비추는 고요한 수채화",
    ];
    for (const a of answers) {
      const r = await submitAttempt(fresh(s.id), a);
      expect(r.ok && r.passed).toBe(true);
    }
    expect(fresh(s.id).completedAt).not.toBeNull();
    expect(progressFor(fresh(s.id)).challenge).toBeNull();
  });
});

describe("학생 입장", () => {
  it("같은 번호·별명이면 다시 들어오기, 다른 별명이면 거부", () => {
    const { c, s } = newStudent(3, "하늘");
    const again = store.joinStudent(c.id, 3, "하늘");
    expect(again.ok && again.student.id).toBe(s.id);
    expect(store.joinStudent(c.id, 3, "바다").ok).toBe(false);
  });

  it("다른 반 학생은 서로 섞이지 않고, 반 삭제 시 기록도 삭제", async () => {
    const a = newStudent(1, "가");
    const b = newStudent(1, "나");
    await submitAttempt(a.s, "빨간 사과");
    expect(store.studentsInClass(a.c.id)).toHaveLength(1);
    expect(store.attemptsForClass(b.c.id)).toHaveLength(0);
    store.deleteClass(a.c.id);
    expect(store.getStudent(a.s.id)).toBeUndefined();
    expect(store.attemptsForClass(a.c.id)).toHaveLength(0);
  });

  it("보존 기간이 지난 반은 자동 삭제", () => {
    const { c } = newStudent();
    store.updateClass(c.id, {});
    store.getClass(c.id)!.expiresAt = Date.now() - 1;
    expect(store.purgeExpired()).toBe(1);
    expect(store.getClass(c.id)).toBeUndefined();
  });
});

describe("CSV 내보내기", () => {
  it("BOM, 따옴표 처리, 수식 실행 방지", async () => {
    expect(csvCell('말 "안녕"')).toBe('"말 ""안녕"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    const { c, s } = newStudent(5, "별");
    await submitAttempt(s, "=1+1 사과");
    const csv = attemptsCsv(store.studentsInClass(c.id), store.attemptsForClass(c.id));
    expect(csv.startsWith("﻿번호,별명")).toBe(true);
    expect(csv).toContain("'=1+1 사과");
    const sum = summaryCsv(store.studentsInClass(c.id), store.attemptsForClass(c.id));
    expect(sum.split("\r\n")[1]).toMatch(/^5,별,1,,1,/);
  });
});
