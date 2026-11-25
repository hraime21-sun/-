import { NextRequest } from "next/server";
import { badOrigin, fail, isTeacher, json, readJson } from "@/lib/http";
import { MAX_LEVEL, TRIES_PER_ROUND, challengeForLevel } from "@/lib/challenges";
import { progressFor } from "@/lib/game";
import * as store from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const { id } = await params;
  const cls = store.getClass(id);
  if (!cls) return fail("수업이 없습니다.", 404);

  const attempts = store.attemptsForClass(id);
  const students = store.studentsInClass(id).map((s) => {
    const mine = attempts.filter((a) => a.studentId === s.id).sort((a, b) => a.createdAt - b.createdAt);
    const last = mine[mine.length - 1] ?? null;
    const p = progressFor(s);
    const current = challengeForLevel(s.level);
    const currentScores = current ? mine.filter((a) => a.challengeId === current.id).map((a) => a.score) : [];
    return {
      id: s.id,
      number: s.number,
      nickname: s.nickname,
      level: s.level,
      completed: Boolean(s.completedAt),
      lastActiveAt: s.lastActiveAt,
      attemptCount: mine.length,
      round: p.round,
      triesUsed: p.triesUsed,
      bestCurrent: currentScores.length ? Math.max(...currentScores) : null,
      passScore: current?.passScore ?? null,
      lastAttempt: last ? { id: last.id, prompt: last.prompt, score: last.score, passed: last.passed, level: last.level, at: last.createdAt } : null,
    };
  });

  const levelCounts = Array.from({ length: MAX_LEVEL + 1 }, (_, i) =>
    i < MAX_LEVEL ? students.filter((s) => !s.completed && s.level === i + 1).length : students.filter((s) => s.completed).length,
  );

  return json({
    class: { id: cls.id, title: cls.title, joinCode: cls.joinCode, locked: cls.locked, spotlight: cls.spotlight, expiresAt: cls.expiresAt },
    maxLevel: MAX_LEVEL,
    triesPerRound: TRIES_PER_ROUND,
    students,
    levelCounts, // [레벨1 도전 중, ..., 레벨N 도전 중, 완료]
    totalAttempts: attempts.length,
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (badOrigin(req)) return fail("잘못된 요청입니다.", 403);
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const { id } = await params;
  const cls = store.getClass(id);
  if (!cls) return fail("수업이 없습니다.", 404);
  const body = await readJson(req);

  const patch: Parameters<typeof store.updateClass>[1] = {};
  if (typeof body.locked === "boolean") patch.locked = body.locked;
  if (body.spotlightAttemptId === null) patch.spotlight = null;
  else if (typeof body.spotlightAttemptId === "string") {
    const a = store.getAttempt(body.spotlightAttemptId);
    if (!a || a.classId !== id) return fail("기록을 찾을 수 없습니다.", 404);
    const s = store.getStudent(a.studentId);
    patch.spotlight = { attemptId: a.id, nickname: s?.nickname ?? "친구", prompt: a.prompt, score: a.score, challengeId: a.challengeId, at: Date.now() };
  }
  store.updateClass(id, patch);
  return json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (badOrigin(req)) return fail("잘못된 요청입니다.", 403);
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const { id } = await params;
  if (!store.deleteClass(id)) return fail("수업이 없습니다.", 404);
  return json({ ok: true });
}
