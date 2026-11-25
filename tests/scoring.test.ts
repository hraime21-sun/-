import { describe, expect, it } from "vitest";
import { CHALLENGES, challengeForLevel } from "@/lib/challenges";
import { defaultTip, keywordMatches, scoreFromMatched } from "@/lib/scoring";

const lv1 = challengeForLevel(1)!;
const lv4 = challengeForLevel(4)!;

describe("키워드 채점", () => {
  it("조사가 붙어도 요소를 찾는다", () => {
    expect(keywordMatches(lv1, "빨간 사과가 있어요")).toEqual(["subject", "color"]);
  });

  it("짧은 설명은 통과 못 하고, 자세한 설명은 통과", () => {
    const short = scoreFromMatched(lv1, keywordMatches(lv1, "과일"));
    const full = scoreFromMatched(lv1, keywordMatches(lv1, "하얀 배경에 초록 잎이 달린 빨간 사과 한 개"));
    expect(short).toBeLessThan(lv1.passScore);
    expect(full).toBe(100);
  });

  it("문장 끝의 짧은 낱말(연)도 잡는다", () => {
    expect(keywordMatches(lv4, "아이가 공원에서 날리는 연")).toContain("kite");
  });

  it("모든 그림은 '전부 맞히면 통과' 가능하고 점수 기준이 레벨마다 오른다", () => {
    let prev = 0;
    for (const c of CHALLENGES) {
      expect(scoreFromMatched(c, c.checklist.map((i) => i.id))).toBe(100);
      expect(c.passScore).toBeGreaterThan(prev);
      prev = c.passScore;
    }
  });

  it("실패하면 가장 중요한 빠진 요소의 힌트를 준다(정답 단어는 말하지 않음)", () => {
    const tip = defaultTip(lv1, ["color"], false);
    expect(tip).toContain("주인공");
    expect(tip).not.toContain("사과");
  });
});
