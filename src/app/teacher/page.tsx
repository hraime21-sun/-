"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ClassInfo = { id: string; title: string; joinCode: string; createdAt: number; expiresAt: number; studentCount: number };

const post = (url: string, body: unknown, method = "POST") =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function Teacher() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const loadClasses = useCallback(async () => {
    const res = await fetch("/api/teacher/classes", { cache: "no-store" });
    if (res.status === 401) return setLoggedIn(false);
    setClasses((await res.json()).classes);
  }, []);

  useEffect(() => {
    fetch("/api/teacher/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLoggedIn(d.loggedIn);
        if (d.loggedIn) loadClasses();
      });
  }, [loadClasses]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await post("/api/teacher/login", { password });
    if (!res.ok) return setError((await res.json()).error);
    setPassword("");
    setLoggedIn(true);
    loadClasses();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await post("/api/teacher/classes", { title });
    if (!res.ok) return setError((await res.json()).error);
    setTitle("");
    loadClasses();
  }

  async function logout() {
    await fetch("/api/teacher/login", { method: "DELETE" });
    setLoggedIn(false);
  }

  if (loggedIn === null) return <main className="wrap muted">확인 중…</main>;

  if (!loggedIn)
    return (
      <main className="wrap" style={{ maxWidth: 420 }}>
        <form className="card" onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 60 }}>
          <h2>선생님 로그인</h2>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="교사 비밀번호" autoComplete="current-password" />
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={!password}>
            로그인
          </button>
          <Link href="/" className="small muted">
            ← 학생 화면
          </Link>
        </form>
      </main>
    );

  return (
    <main className="wrap">
      <div className="row" style={{ marginBottom: 20 }}>
        <h1>내 수업</h1>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={logout}>
          로그아웃
        </button>
      </div>
      <form className="card row" onSubmit={create} style={{ marginBottom: 20 }}>
        <input className="input" style={{ flex: 1, minWidth: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="새 수업 이름 (예: 261125 4학년 2반 프롬프트 연습)" maxLength={40} />
        <button className="btn" disabled={!title.trim()}>
          + 수업 만들기
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="card">
        {classes.length === 0 ? (
          <p className="muted">아직 수업이 없습니다. 위에서 만들어 보세요.</p>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>수업</th>
                <th>수업 코드</th>
                <th>학생</th>
                <th>자동 삭제</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.title}</b>
                  </td>
                  <td style={{ fontFamily: "Consolas, monospace", fontWeight: 800, letterSpacing: 2 }}>{c.joinCode}</td>
                  <td>{c.studentCount}명</td>
                  <td className="muted small">{new Date(c.expiresAt).toLocaleDateString("ko-KR")}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn sm" href={`/teacher/${c.id}`} style={{ textDecoration: "none" }}>
                      대시보드 열기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>
        🔒 학생 기록은 수업을 만든 날부터 정해진 기간이 지나면 자동으로 삭제됩니다. 필요한 기록은 대시보드에서 미리 내려받으세요.
      </p>
    </main>
  );
}
