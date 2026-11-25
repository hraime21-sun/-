import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { readToken, STUDENT_COOKIE, TEACHER_COOKIE } from "./session";
import * as store from "./store";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(reason: string, status = 400) {
  return json({ error: reason }, status);
}

/** 상태를 바꾸는 요청은 같은 사이트에서 온 JSON 요청만 받습니다 (CSRF 방지). */
export function badOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return true;
  if (req.method !== "DELETE" && !(req.headers.get("content-type") || "").includes("application/json")) return true;
  return false;
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function isTeacher(req: NextRequest): boolean {
  return readToken(req.cookies.get(TEACHER_COOKIE)?.value)?.role === "teacher";
}

export function currentStudent(req: NextRequest): store.Student | null {
  const s = readToken(req.cookies.get(STUDENT_COOKIE)?.value);
  if (!s || s.role !== "student") return null;
  const student = store.getStudent(s.sid);
  if (!student || student.classId !== s.cid) return null;
  return student;
}

export function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
