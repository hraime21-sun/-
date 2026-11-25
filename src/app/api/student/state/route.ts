import { NextRequest } from "next/server";
import { currentStudent, fail, json } from "@/lib/http";
import { progressFor } from "@/lib/game";
import { challengeImageUrl } from "@/lib/images";
import { MAX_LEVEL, TRIES_PER_ROUND } from "@/lib/challenges";
import * as store from "@/lib/store";

export async function GET(req: NextRequest) {
  const student = currentStudent(req);
  if (!student) return fail("먼저 수업에 들어와 주세요.", 401);
  const cls = store.getClass(student.classId)!;
  const p = progressFor(student);
  const c = p.challenge;

  return json({
    student: { number: student.number, nickname: student.nickname, level: student.level, completed: Boolean(student.completedAt) },
    class: { title: cls.title, locked: cls.locked },
    spotlight: cls.spotlight ? { nickname: cls.spotlight.nickname, prompt: cls.spotlight.prompt, score: cls.spotlight.score, at: cls.spotlight.at } : null,
    maxLevel: MAX_LEVEL,
    triesPerRound: TRIES_PER_ROUND,
    challenge: c
      ? {
          id: c.id,
          level: c.level,
          title: c.title,
          goal: c.goal,
          passScore: c.passScore,
          image: challengeImageUrl(c.id),
          // 아직 못 찾은 요소의 이름은 보내지 않습니다 (정답 노출 방지)
          items: c.checklist.map((i) => (p.foundIds.includes(i.id) ? { id: i.id, found: true, label: i.label } : { id: i.id, found: false, label: null })),
        }
      : null,
    round: p.round,
    triesLeft: TRIES_PER_ROUND - p.triesUsed,
    revealedHints: p.revealedHints,
    attempts: p.attempts.map((a) => ({ id: a.id, round: a.round, tryNo: a.tryNo, prompt: a.prompt, score: a.score, feedback: a.feedback, passed: a.passed })),
  });
}
