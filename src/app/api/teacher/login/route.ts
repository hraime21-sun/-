import { NextRequest } from "next/server";
import { badOrigin, clientKey, fail, isTeacher, json, readJson } from "@/lib/http";
import { allow } from "@/lib/ratelimit";
import { checkTeacherPassword, cookieOptions, createToken, TEACHER_COOKIE, TEACHER_TTL_SEC } from "@/lib/session";

export async function GET(req: NextRequest) {
  return json({ loggedIn: isTeacher(req) });
}

export async function POST(req: NextRequest) {
  if (badOrigin(req)) return fail("잘못된 요청입니다.", 403);
  // 비밀번호 무차별 대입 방지: 10분에 10번
  if (!allow(`login:${clientKey(req)}`, 10, 10 * 60_000)) return fail("시도가 너무 많습니다. 10분 뒤에 다시 하세요.", 429);
  const body = await readJson(req);
  if (!checkTeacherPassword(body.password)) return fail("비밀번호가 맞지 않습니다.", 401);
  const res = json({ ok: true });
  res.cookies.set(TEACHER_COOKIE, createToken({ role: "teacher", exp: Date.now() + TEACHER_TTL_SEC * 1000 }), cookieOptions(TEACHER_TTL_SEC));
  return res;
}

export async function DELETE(req: NextRequest) {
  if (badOrigin(req)) return fail("잘못된 요청입니다.", 403);
  const res = json({ ok: true });
  res.cookies.set(TEACHER_COOKIE, "", cookieOptions(0));
  return res;
}
