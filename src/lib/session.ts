// HMAC 으로 서명한 쿠키 세션. DB 직접 접근은 서버에서만 하고, 브라우저에는 서명된 토큰만 줍니다.
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export type TeacherSession = { role: "teacher"; exp: number };
export type StudentSession = { role: "student"; sid: string; cid: string; exp: number };
export type Session = TeacherSession | StudentSession;

export const TEACHER_COOKIE = "ppc_t";
export const STUDENT_COOKIE = "ppc_s";
export const TEACHER_TTL_SEC = 60 * 60 * 8; // 8시간
export const STUDENT_TTL_SEC = 60 * 60 * 12; // 12시간

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET 이 없거나 너무 짧습니다(32자 이상). .env.local 을 확인하세요.");
  }
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createToken(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (typeof s.exp !== "number" || s.exp < Date.now()) return null;
    if (s.role !== "teacher" && s.role !== "student") return null;
    return s;
  } catch {
    return null;
  }
}

export function checkTeacherPassword(given: unknown): boolean {
  const real = process.env.TEACHER_PASSWORD;
  if (!real || typeof given !== "string" || given.length === 0) return false;
  const a = createHash("sha256").update(real).digest();
  const b = createHash("sha256").update(given).digest();
  return timingSafeEqual(a, b);
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
