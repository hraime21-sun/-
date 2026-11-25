// JSON 파일 저장소 (교실 1개 서버용). 데이터는 data/db.json 에 저장되며 .gitignore 로 커밋되지 않습니다.
// 학생 정보는 '번호 + 별명'만 저장합니다. 실명·연락처·이메일은 받지 않습니다.
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

export type Spotlight = { attemptId: string; nickname: string; prompt: string; score: number; challengeId: string; at: number };

export type ClassRoom = {
  id: string;
  title: string;
  joinCode: string;
  createdAt: number;
  expiresAt: number;
  locked: boolean;
  spotlight: Spotlight | null;
};

export type Student = {
  id: string;
  classId: string;
  number: number;
  nickname: string;
  joinedAt: number;
  lastActiveAt: number;
  level: number; // 지금 도전 중인 레벨
  completedAt: number | null;
};

export type Attempt = {
  id: string;
  classId: string;
  studentId: string;
  challengeId: string;
  level: number;
  round: number;
  tryNo: number;
  prompt: string;
  score: number;
  matched: string[];
  feedback: string;
  passed: boolean;
  scorer: "keyword" | "gemini";
  createdAt: number;
};

type Db = { classes: ClassRoom[]; students: Student[]; attempts: Attempt[] };

const g = globalThis as unknown as { __ppcDb?: { file: string; db: Db } };

function dataFile(): string {
  return process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json");
}

function load(): Db {
  const file = dataFile();
  if (g.__ppcDb && g.__ppcDb.file === file) return g.__ppcDb.db;
  let db: Db = { classes: [], students: [], attempts: [] };
  if (fs.existsSync(/*turbopackIgnore: true*/ file)) {
    db = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as Db;
  }
  g.__ppcDb = { file, db };
  purgeExpired();
  return db;
}

function save() {
  const file = dataFile();
  const db = load();
  fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(db), "utf8");
  fs.renameSync(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ file);
}

/** 테스트용: 메모리 캐시를 비웁니다. */
export function resetStoreCache() {
  delete g.__ppcDb;
}

function retentionMs(): number {
  const days = Number(process.env.RETENTION_DAYS || 30);
  return (Number.isFinite(days) && days > 0 ? days : 30) * 24 * 60 * 60 * 1000;
}

export function purgeExpired(now = Date.now()): number {
  const db = g.__ppcDb?.db;
  if (!db) return 0;
  const expired = new Set(db.classes.filter((c) => c.expiresAt <= now).map((c) => c.id));
  if (expired.size === 0) return 0;
  removeClasses(db, expired);
  save();
  return expired.size;
}

function removeClasses(db: Db, ids: Set<string>) {
  db.classes = db.classes.filter((c) => !ids.has(c.id));
  db.students = db.students.filter((s) => !ids.has(s.classId));
  db.attempts = db.attempts.filter((a) => !ids.has(a.classId));
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O, 1/I 제외

function newJoinCode(db: Db): string {
  for (;;) {
    const bytes = randomBytes(6);
    const code = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    if (!db.classes.some((c) => c.joinCode === code)) return code;
  }
}

// ── 학급 ──
export function createClass(title: string): ClassRoom {
  const db = load();
  const now = Date.now();
  const c: ClassRoom = {
    id: randomUUID(),
    title,
    joinCode: newJoinCode(db),
    createdAt: now,
    expiresAt: now + retentionMs(),
    locked: false,
    spotlight: null,
  };
  db.classes.push(c);
  save();
  return c;
}

export function listClasses(): ClassRoom[] {
  return [...load().classes].sort((a, b) => b.createdAt - a.createdAt);
}

export function getClass(id: string): ClassRoom | undefined {
  return load().classes.find((c) => c.id === id);
}

export function getClassByCode(code: string): ClassRoom | undefined {
  const norm = code.trim().toUpperCase();
  return load().classes.find((c) => c.joinCode === norm);
}

export function updateClass(id: string, patch: Partial<Pick<ClassRoom, "locked" | "spotlight" | "title">>): ClassRoom | undefined {
  const c = getClass(id);
  if (!c) return undefined;
  Object.assign(c, patch);
  save();
  return c;
}

export function deleteClass(id: string): boolean {
  const db = load();
  if (!db.classes.some((c) => c.id === id)) return false;
  removeClasses(db, new Set([id]));
  save();
  return true;
}

// ── 학생 ──
export type JoinResult = { ok: true; student: Student; rejoined: boolean } | { ok: false; reason: string };

export function joinStudent(classId: string, number: number, nickname: string): JoinResult {
  const db = load();
  const existing = db.students.find((s) => s.classId === classId && s.number === number);
  if (existing) {
    if (existing.nickname !== nickname) return { ok: false, reason: `${number}번은 이미 다른 별명으로 들어와 있어요. 선생님께 말씀드려요.` };
    existing.lastActiveAt = Date.now();
    save();
    return { ok: true, student: existing, rejoined: true };
  }
  const now = Date.now();
  const student: Student = {
    id: randomUUID(),
    classId,
    number,
    nickname,
    joinedAt: now,
    lastActiveAt: now,
    level: 1,
    completedAt: null,
  };
  db.students.push(student);
  save();
  return { ok: true, student, rejoined: false };
}

export function getStudent(id: string): Student | undefined {
  return load().students.find((s) => s.id === id);
}

export function studentsInClass(classId: string): Student[] {
  return load()
    .students.filter((s) => s.classId === classId)
    .sort((a, b) => a.number - b.number);
}

export function updateStudent(id: string, patch: Partial<Pick<Student, "level" | "completedAt" | "lastActiveAt">>): Student | undefined {
  const s = getStudent(id);
  if (!s) return undefined;
  Object.assign(s, patch);
  save();
  return s;
}

export function deleteStudent(classId: string, studentId: string): boolean {
  const db = load();
  const before = db.students.length;
  db.students = db.students.filter((s) => !(s.id === studentId && s.classId === classId));
  if (db.students.length === before) return false;
  db.attempts = db.attempts.filter((a) => a.studentId !== studentId);
  save();
  return true;
}

// ── 시도 기록 ──
export function addAttempt(a: Omit<Attempt, "id" | "createdAt">): Attempt {
  const db = load();
  const attempt: Attempt = { ...a, id: randomUUID(), createdAt: Date.now() };
  db.attempts.push(attempt);
  save();
  return attempt;
}

export function attemptsForStudent(studentId: string): Attempt[] {
  return load().attempts.filter((a) => a.studentId === studentId);
}

export function attemptsForClass(classId: string): Attempt[] {
  return load().attempts.filter((a) => a.classId === classId);
}

export function getAttempt(id: string): Attempt | undefined {
  return load().attempts.find((a) => a.id === id);
}
