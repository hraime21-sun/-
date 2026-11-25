// 게임 규칙: 레벨마다 그림 1장, 한 라운드에 3번 기회. 3번 모두 실패하면 힌트를 하나 더 공개하고 새 라운드.
import { challengeForLevel, MAX_LEVEL, TRIES_PER_ROUND, type Challenge } from "./challenges";
import { defaultTip, keywordMatches, scoreFromMatched } from "./scoring";
import * as store from "./store";
import type { Attempt, Student } from "./store";

export type Scorer = (challenge: Challenge, prompt: string) => Promise<{ matched: string[]; tip: string } | null>;

export type Progress = {
  challenge: Challenge | null; // null 이면 모든 레벨 완료
  round: number;
  triesUsed: number; // 이번 라운드에 쓴 기회
  attempts: Attempt[]; // 지금 그림에 대한 모든 시도
  foundIds: string[]; // 지금 그림에서 지금까지 찾은 요소
  revealedHints: string[]; // 라운드 실패로 공개된 힌트
};

export function progressFor(student: Student): Progress {
  const challenge = student.completedAt ? null : challengeForLevel(student.level) ?? null;
  if (!challenge) return { challenge: null, round: 0, triesUsed: 0, attempts: [], foundIds: [], revealedHints: [] };
  const attempts = store
    .attemptsForStudent(student.id)
    .filter((a) => a.challengeId === challenge.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const last = attempts[attempts.length - 1];
  let round = 1;
  let triesUsed = 0;
  if (last) {
    round = last.round;
    triesUsed = attempts.filter((a) => a.round === round).length;
    if (triesUsed >= TRIES_PER_ROUND) {
      round += 1;
      triesUsed = 0;
    }
  }
  const foundIds = [...new Set(attempts.flatMap((a) => a.matched))];
  // 끝난(실패한) 라운드 수만큼, 아직 못 찾은 요소의 이름을 힌트로 공개
  const failedRounds = round - 1;
  const revealedHints = challenge.checklist
    .filter((i) => !foundIds.includes(i.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, failedRounds)
    .map((i) => `${i.hint} → "${i.label}"`);
  return { challenge, round, triesUsed, attempts, foundIds, revealedHints };
}

export type SubmitResult =
  | { ok: true; attempt: Attempt; passed: boolean; levelUp: boolean; completed: boolean; roundOver: boolean }
  | { ok: false; reason: string };

export async function submitAttempt(student: Student, prompt: string, aiScorer?: Scorer): Promise<SubmitResult> {
  const cls = store.getClass(student.classId);
  if (!cls) return { ok: false, reason: "수업을 찾을 수 없어요." };
  if (cls.locked) return { ok: false, reason: "⏸ 선생님이 잠시 멈췄어요. 화면을 봐 주세요." };
  const p = progressFor(student);
  if (!p.challenge) return { ok: false, reason: "모든 레벨을 완료했어요! 🎉" };
  const challenge = p.challenge;

  const kw = keywordMatches(challenge, prompt);
  let matched = kw;
  let tip: string | null = null;
  let scorer: Attempt["scorer"] = "keyword";
  if (aiScorer) {
    const ai = await aiScorer(challenge, prompt);
    if (ai) {
      matched = [...new Set([...kw, ...ai.matched])];
      tip = ai.tip || null;
      scorer = "gemini";
    }
  }
  const score = scoreFromMatched(challenge, matched);
  const passed = score >= challenge.passScore;
  if (passed || !tip) tip = defaultTip(challenge, matched, passed);

  const attempt = store.addAttempt({
    classId: student.classId,
    studentId: student.id,
    challengeId: challenge.id,
    level: challenge.level,
    round: p.round,
    tryNo: p.triesUsed + 1,
    prompt,
    score,
    matched,
    feedback: tip,
    passed,
    scorer,
  });

  const now = Date.now();
  let levelUp = false;
  let completed = false;
  if (passed) {
    if (challenge.level >= MAX_LEVEL) {
      store.updateStudent(student.id, { completedAt: now, lastActiveAt: now });
      completed = true;
    } else {
      store.updateStudent(student.id, { level: challenge.level + 1, lastActiveAt: now });
      levelUp = true;
    }
  } else {
    store.updateStudent(student.id, { lastActiveAt: now });
  }
  const roundOver = !passed && p.triesUsed + 1 >= TRIES_PER_ROUND;
  return { ok: true, attempt, passed, levelUp, completed, roundOver };
}
