import { beforeEach, describe, expect, it } from "vitest";
import { checkTeacherPassword, createToken, readToken } from "@/lib/session";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-".padEnd(40, "x");
  process.env.TEACHER_PASSWORD = "correct-horse";
});

describe("세션 토큰", () => {
  it("서명된 토큰은 읽히고, 위조하면 거부", () => {
    const t = createToken({ role: "student", sid: "s1", cid: "c1", exp: Date.now() + 10_000 });
    expect(readToken(t)).toMatchObject({ role: "student", sid: "s1" });

    // 학생이 토큰 내용을 교사로 바꿔치기해도 서명이 맞지 않아 거부
    const [, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ role: "teacher", exp: Date.now() + 10_000 })).toString("base64url");
    expect(readToken(`${forged}.${sig}`)).toBeNull();
  });

  it("만료된 토큰 거부", () => {
    expect(readToken(createToken({ role: "teacher", exp: Date.now() - 1 }))).toBeNull();
  });

  it("다른 비밀값으로 만든 토큰 거부", () => {
    const t = createToken({ role: "teacher", exp: Date.now() + 10_000 });
    process.env.SESSION_SECRET = "another-secret-".padEnd(40, "y");
    expect(readToken(t)).toBeNull();
  });

  it("SESSION_SECRET 이 짧으면 실행을 멈춘다", () => {
    process.env.SESSION_SECRET = "short";
    expect(() => createToken({ role: "teacher", exp: 1 })).toThrow();
  });

  it("교사 비밀번호 확인", () => {
    expect(checkTeacherPassword("correct-horse")).toBe(true);
    expect(checkTeacherPassword("wrong")).toBe(false);
    expect(checkTeacherPassword("")).toBe(false);
    delete process.env.TEACHER_PASSWORD;
    expect(checkTeacherPassword("")).toBe(false);
  });
});
