import { NextRequest } from "next/server";
import { badOrigin, clientKey, fail, json, readJson } from "@/lib/http";
import { checkNickname, checkStudentNumber } from "@/lib/safety";
import { allow } from "@/lib/ratelimit";
import { cookieOptions, createToken, STUDENT_COOKIE, STUDENT_TTL_SEC } from "@/lib/session";
import * as store from "@/lib/store";

export async function POST(req: NextRequest) {
  if (badOrigin(req)) return fail("잘못된 요청이에요.", 403);
  if (!allow(`join:${clientKey(req)}`, 60, 60_000)) return fail("잠시 후 다시 해 볼까요?", 429);
  const body = await readJson(req);

  const cls = typeof body.code === "string" ? store.getClassByCode(body.code) : undefined;
  if (!cls) return fail("수업 코드를 다시 확인해 주세요.");
  const number = checkStudentNumber(body.number);
  if (number === null) return fail("번호는 1~60 사이 숫자로 써 주세요.");
  const nick = checkNickname(body.nickname);
  if (!nick.ok) return fail(nick.reason);

  const r = store.joinStudent(cls.id, number, nick.value);
  if (!r.ok) return fail(r.reason, 409);

  const res = json({ ok: true });
  res.cookies.set(
    STUDENT_COOKIE,
    createToken({ role: "student", sid: r.student.id, cid: cls.id, exp: Date.now() + STUDENT_TTL_SEC * 1000 }),
    cookieOptions(STUDENT_TTL_SEC),
  );
  return res;
}

export async function DELETE(req: NextRequest) {
  if (badOrigin(req)) return fail("잘못된 요청이에요.", 403);
  const res = json({ ok: true });
  res.cookies.set(STUDENT_COOKIE, "", cookieOptions(0));
  return res;
}
