// 키워드 채점: AI 없이도 항상 동작하는 기본 채점기. (Gemini 채점이 실패하면 이것으로 대신합니다)
import type { Challenge } from "./challenges";

function prep(text: string): string {
  // 끝에 공백을 붙여 "연 " 같은 키워드가 문장 끝에서도 잡히도록 합니다.
  return ` ${text.normalize("NFC").toLowerCase().replace(/\s+/g, " ")} `;
}

export function keywordMatches(challenge: Challenge, prompt: string): string[] {
  const p = prep(prompt);
  return challenge.checklist.filter((item) => item.keywords.some((k) => p.includes(k.toLowerCase()))).map((i) => i.id);
}

export function scoreFromMatched(challenge: Challenge, matched: string[]): number {
  const total = challenge.checklist.reduce((s, i) => s + i.weight, 0);
  const got = challenge.checklist.filter((i) => matched.includes(i.id)).reduce((s, i) => s + i.weight, 0);
  return total === 0 ? 0 : Math.round((got / total) * 100);
}

/** 못 찾은 요소 중 가장 중요한 것의 힌트 질문 */
export function nextHint(challenge: Challenge, matched: string[]): string | null {
  const missing = challenge.checklist.filter((i) => !matched.includes(i.id)).sort((a, b) => b.weight - a.weight);
  return missing[0]?.hint ?? null;
}

export function defaultTip(challenge: Challenge, matched: string[], passed: boolean): string {
  if (passed) return "🎉 아주 잘 설명했어요! 그림의 중요한 부분을 잘 찾았어요.";
  const hint = nextHint(challenge, matched);
  return hint ? `💡 ${hint}` : "💡 조금 더 자세히 설명해 볼까요?";
}
