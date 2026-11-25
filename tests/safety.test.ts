import { describe, expect, it } from "vitest";
import { checkNickname, checkPrompt, checkStudentNumber } from "@/lib/safety";

describe("프롬프트 개인정보·금칙어 필터", () => {
  it.each([
    ["우리 엄마 번호는 010-1234-5678", "전화번호"],
    ["01012345678 사과", "전화번호"],
    ["990101-1234567", "주민등록번호"],
    ["kid@school.kr 로 보내줘", "이메일"],
    ["101동 1203호에 사는 사과", "주소"],
    ["행복로 12 에 있는 사과", "주소"],
  ])("'%s' → %s 차단", (text) => {
    const r = checkPrompt(text);
    expect(r.ok).toBe(false);
  });

  it("욕설은 띄어쓰기를 섞어도 차단", () => {
    expect(checkPrompt("씨 발 사과").ok).toBe(false);
  });

  it("정상 설명은 통과하고 공백을 정리", () => {
    const r = checkPrompt("  빨간   사과 한 개가  있어요 ");
    expect(r).toEqual({ ok: true, value: "빨간 사과 한 개가 있어요" });
  });

  it("숫자가 들어간 정상 설명(개수)은 통과", () => {
    expect(checkPrompt("파란 풍선 3개가 하늘에 떠 있어요").ok).toBe(true);
    expect(checkPrompt("풍선이 하늘로 3개 날아가요").ok).toBe(true);
    expect(checkPrompt("새가 바다로 12마리 날아가요").ok).toBe(true);
  });

  it("길이 제한", () => {
    expect(checkPrompt("a").ok).toBe(false);
    expect(checkPrompt("가".repeat(151)).ok).toBe(false);
    expect(checkPrompt(123).ok).toBe(false);
  });
});

describe("별명·번호 검사", () => {
  it("한글/영문/숫자 1~10자만", () => {
    expect(checkNickname("반짝별").ok).toBe(true);
    expect(checkNickname("<script>").ok).toBe(false);
    expect(checkNickname("가".repeat(11)).ok).toBe(false);
    expect(checkNickname("별01012345").ok).toBe(false);
  });
  it("번호는 1~60 정수", () => {
    expect(checkStudentNumber(7)).toBe(7);
    expect(checkStudentNumber("12")).toBe(12);
    expect(checkStudentNumber(0)).toBeNull();
    expect(checkStudentNumber(2.5)).toBeNull();
    expect(checkStudentNumber("abc")).toBeNull();
  });
});
