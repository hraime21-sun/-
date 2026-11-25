import { NextRequest } from "next/server";
import { badOrigin, fail, isTeacher, json, readJson } from "@/lib/http";
import { checkTitle } from "@/lib/safety";
import * as store from "@/lib/store";

export async function GET(req: NextRequest) {
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const classes = store.listClasses().map((c) => ({
    id: c.id,
    title: c.title,
    joinCode: c.joinCode,
    createdAt: c.createdAt,
    expiresAt: c.expiresAt,
    studentCount: store.studentsInClass(c.id).length,
  }));
  return json({ classes });
}

export async function POST(req: NextRequest) {
  if (badOrigin(req)) return fail("잘못된 요청입니다.", 403);
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const body = await readJson(req);
  const t = checkTitle(body.title);
  if (!t.ok) return fail(t.reason);
  const c = store.createClass(t.value);
  return json({ id: c.id, joinCode: c.joinCode }, 201);
}
