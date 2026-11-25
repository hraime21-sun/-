import { NextRequest } from "next/server";
import { badOrigin, currentStudent, fail, json, readJson } from "@/lib/http";
import { checkPrompt } from "@/lib/safety";
import { allow } from "@/lib/ratelimit";
import { submitAttempt } from "@/lib/game";
import { geminiEnabled, geminiScore } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  if (badOrigin(req)) return fail("잘못된 요청이에요.", 403);
  const student = currentStudent(req);
  if (!student) return fail("먼저 수업에 들어와 주세요.", 401);
  const body = await readJson(req);
  const checked = checkPrompt(body.prompt);
  if (!checked.ok) return fail(checked.reason, 422);

  // 채점(=AI 호출)까지 가는 제출만 제한: 학생 1명당 3초에 1번, 반 전체는 1분에 120번 (비용·남용 방지)
  if (!allow(`try:${student.id}`, 1, 3000)) return fail("천천히! 3초 뒤에 다시 제출해요.", 429);
  if (!allow(`class:${student.classId}`, 120, 60_000)) return fail("지금 제출이 많아요. 잠시 후 다시 해요.", 429);

  const r = await submitAttempt(student, checked.value, geminiEnabled() ? geminiScore : undefined);
  if (!r.ok) return fail(r.reason, 409);
  return json({
    score: r.attempt.score,
    passed: r.passed,
    feedback: r.attempt.feedback,
    levelUp: r.levelUp,
    completed: r.completed,
    roundOver: r.roundOver,
  });
}
