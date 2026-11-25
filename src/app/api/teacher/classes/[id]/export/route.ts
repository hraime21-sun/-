import { NextRequest, NextResponse } from "next/server";
import { fail, isTeacher } from "@/lib/http";
import { attemptsCsv, summaryCsv } from "@/lib/csv";
import * as store from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isTeacher(req)) return fail("로그인이 필요합니다.", 401);
  const { id } = await params;
  const cls = store.getClass(id);
  if (!cls) return fail("수업이 없습니다.", 404);
  const type = req.nextUrl.searchParams.get("type") === "summary" ? "summary" : "attempts";
  const students = store.studentsInClass(id);
  const attempts = store.attemptsForClass(id);
  const csv = type === "summary" ? summaryCsv(students, attempts) : attemptsCsv(students, attempts);
  const date = new Date().toISOString().slice(0, 10);
  const name = `${cls.title}_${type === "summary" ? "요약" : "전체기록"}_${date}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
