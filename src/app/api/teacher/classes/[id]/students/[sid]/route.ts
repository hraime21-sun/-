import { NextRequest } from "next/server";
import { badOrigin, fail, isTeacher, json } from "@/lib/http";
import { challengeById } from "@/lib/challenges";
import * as store from "@/lib/store";

type Ctx = { params: Promise<{ id: string; sid: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const { id, sid } = await params;
  const s = store.getStudent(sid);
  if (!s || s.classId !== id) return fail("학생을 찾을 수 없습니다.", 404);
  const attempts = store
    .attemptsForStudent(sid)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((a) => {
      const c = challengeById(a.challengeId);
      return {
        id: a.id,
        level: a.level,
        round: a.round,
        tryNo: a.tryNo,
        prompt: a.prompt,
        score: a.score,
        passScore: c?.passScore ?? null,
        passed: a.passed,
        feedback: a.feedback,
        scorer: a.scorer,
        found: c ? c.checklist.filter((i) => a.matched.includes(i.id)).map((i) => i.label) : [],
        missing: c ? c.checklist.filter((i) => !a.matched.includes(i.id)).map((i) => i.label) : [],
        at: a.createdAt,
      };
    });
  return json({ student: { id: s.id, number: s.number, nickname: s.nickname, level: s.level, completed: Boolean(s.completedAt) }, attempts });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (badOrigin(req)) return fail("잘못된 요청입니다.", 403);
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const { id, sid } = await params;
  if (!store.deleteStudent(id, sid)) return fail("학생을 찾을 수 없습니다.", 404);
  return json({ ok: true });
}
