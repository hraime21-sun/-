"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type StudentRow = {
  id: string;
  number: number;
  nickname: string;
  level: number;
  completed: boolean;
  lastActiveAt: number;
  attemptCount: number;
  round: number;
  triesUsed: number;
  bestCurrent: number | null;
  passScore: number | null;
  lastAttempt: { id: string; prompt: string; score: number; passed: boolean; level: number; at: number } | null;
};
type Dash = {
  class: { id: string; title: string; joinCode: string; locked: boolean; spotlight: { nickname: string; prompt: string; score: number } | null; expiresAt: number };
  maxLevel: number;
  triesPerRound: number;
  students: StudentRow[];
  levelCounts: number[];
  totalAttempts: number;
};
type Detail = {
  student: { id: string; number: number; nickname: string; level: number; completed: boolean };
  attempts: { id: string; level: number; round: number; tryNo: number; prompt: string; score: number; passScore: number | null; passed: boolean; feedback: string; scorer: string; found: string[]; missing: string[]; at: number }[];
};

const LEVEL_COLORS = ["#b39ddb", "#9575cd", "#7e57c2", "#5e35b1", "#4527a0", "#1a9c5b"];
const IDLE_MS = 3 * 60 * 1000;

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });

function timeAgo(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  return `${Math.floor(s / 3600)}시간 전`;
}

export default function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dash, setDash] = useState<Dash | null>(null);
  const [cols, setCols] = useState(5);
  const [sort, setSort] = useState<"number" | "level" | "recent">("number");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/teacher/classes/${id}`, { cache: "no-store" });
    if (res.status === 401) return router.replace("/teacher");
    if (res.status === 404) return setError("수업을 찾을 수 없습니다.");
    setDash(await res.json());
  }, [id, router]);

  const openDetail = useCallback(
    async (sid: string) => {
      const res = await fetch(`/api/teacher/classes/${id}/students/${sid}`, { cache: "no-store" });
      if (res.ok) setDetail(await res.json());
    },
    [id],
  );

  useEffect(() => {
    load();
    const t = setInterval(load, 2000); // 2초마다 학생 진행 상황 갱신
    return () => clearInterval(t);
  }, [load]);

  // 열어 둔 학생 기록도 함께 갱신
  useEffect(() => {
    if (!detail) return;
    const t = setInterval(() => openDetail(detail.student.id), 3000);
    return () => clearInterval(t);
  }, [detail, openDetail]);

  const students = useMemo(() => {
    const list = [...(dash?.students ?? [])];
    if (sort === "level") list.sort((a, b) => Number(b.completed) - Number(a.completed) || b.level - a.level || (b.bestCurrent ?? 0) - (a.bestCurrent ?? 0));
    if (sort === "recent") list.sort((a, b) => (b.lastAttempt?.at ?? 0) - (a.lastAttempt?.at ?? 0));
    return list;
  }, [dash, sort]);

  if (error) return <main className="wrap error">{error}</main>;
  if (!dash) return <main className="wrap muted">불러오는 중…</main>;

  const total = dash.students.length;
  const done = dash.levelCounts[dash.maxLevel];

  async function toggleLock() {
    await send(`/api/teacher/classes/${id}`, "PATCH", { locked: !dash!.class.locked });
    load();
  }
  async function spotlight(attemptId: string | null) {
    await send(`/api/teacher/classes/${id}`, "PATCH", { spotlightAttemptId: attemptId });
    load();
  }
  async function removeStudent(sid: string, label: string) {
    if (!confirm(`${label} 학생과 기록을 모두 삭제할까요? 되돌릴 수 없습니다.`)) return;
    await send(`/api/teacher/classes/${id}/students/${sid}`, "DELETE");
    setDetail(null);
    load();
  }
  async function removeClass() {
    if (!confirm(`'${dash!.class.title}' 수업과 학생 ${total}명의 기록을 모두 삭제할까요?\n먼저 CSV 를 내려받았는지 확인하세요. 되돌릴 수 없습니다.`)) return;
    await send(`/api/teacher/classes/${id}`, "DELETE");
    router.replace("/teacher");
  }

  return (
    <main className="wrap wide">
      <div className="dash-head">
        <div>
          <Link href="/teacher" className="small muted">
            ← 내 수업
          </Link>
          <h1 style={{ marginTop: 4 }}>{dash.class.title}</h1>
          <div className="progress" style={{ marginTop: 10 }}>
            <div className="row small">
              <b style={{ color: "#e0602c" }}>
                완료: {done}/{total}
              </b>
              <div className="spacer" />
              <span className="muted">총 {dash.totalAttempts}번 제출</span>
            </div>
            <div className="bar">
              <div style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
            </div>
          </div>
        </div>
        <div className="spacer" />
        <div>
          <div className="small muted" style={{ marginBottom: 4 }}>
            레벨별 학생 분포
          </div>
          <div className="dist">
            {dash.levelCounts.map((n, i) =>
              n > 0 ? (
                <div key={i} style={{ flex: n, background: LEVEL_COLORS[i] }} title={i < dash.maxLevel ? `레벨 ${i + 1}: ${n}명` : `완료: ${n}명`}>
                  {i < dash.maxLevel ? `Lv${i + 1}·${n}` : `🏆${n}`}
                </div>
              ) : null,
            )}
            {total === 0 && <div style={{ flex: 1, color: "var(--muted)" }}>아직 아무도 없어요</div>}
          </div>
        </div>
        <div className="code-box">
          <div className="small" style={{ opacity: 0.7 }}>
            수업 코드
          </div>
          <div className="code">{dash.class.joinCode}</div>
        </div>
      </div>

      {dash.class.spotlight && (
        <div className="spot row">
          <span>
            ⭐ 학생 화면에 공유 중: <b>{dash.class.spotlight.nickname}</b> “{dash.class.spotlight.prompt}”
          </span>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={() => spotlight(null)}>
            공유 끄기
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="stepper" aria-label="한 줄에 보이는 학생 수">
          <button onClick={() => setCols((c) => Math.max(2, c - 1))}>−</button>
          <span>{cols}</span>
          <button onClick={() => setCols((c) => Math.min(8, c + 1))}>+</button>
        </div>
        <select className="input" style={{ width: "auto", padding: "7px 10px" }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="number">번호순</option>
          <option value="level">진도순</option>
          <option value="recent">최근 제출순</option>
        </select>
        <button className={`btn sm ${dash.class.locked ? "" : "ghost"}`} onClick={toggleLock}>
          {dash.class.locked ? "▶ 다시 시작" : "⏸ 모두 멈추기"}
        </button>
        <div className="spacer" />
        <a className="btn ghost sm" href={`/api/teacher/classes/${id}/export?type=summary`} download style={{ textDecoration: "none" }}>
          ⬇ 요약 CSV
        </a>
        <a className="btn ghost sm" href={`/api/teacher/classes/${id}/export?type=attempts`} download style={{ textDecoration: "none" }}>
          ⬇ 전체 기록 CSV
        </a>
        <button className="btn danger sm" onClick={removeClass}>
          수업 삭제
        </button>
      </div>

      {total === 0 ? (
        <div className="card muted">
          학생들이 첫 화면에서 수업 코드 <b>{dash.class.joinCode}</b> 와 번호·별명을 입력하면 여기에 바로 나타납니다.
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {students.map((s) => {
            const idle = Date.now() - s.lastActiveAt > IDLE_MS;
            const status = s.completed ? { icon: "✔", title: "모두 완료" } : s.attemptCount === 0 ? { icon: "○", title: "아직 제출 없음" } : idle ? { icon: "⏸", title: "3분 넘게 멈춤" } : { icon: "🕒", title: "진행 중" };
            return (
              <article key={s.id} className="scard">
                <div className="head">
                  <span className="status" title={status.title}>
                    {status.icon}
                  </span>
                  <span className="name">
                    {s.number}. {s.nickname}
                  </span>
                  <button onClick={() => openDetail(s.id)} title="기록 크게 보기">
                    ⛶
                  </button>
                </div>
                <div className="body">
                  <div className="row" style={{ gap: 6 }}>
                    {s.completed ? <span className="badge ok">🏆 완료</span> : <span className="badge">Lv {s.level}</span>}
                    {!s.completed && (
                      <span className="small muted">
                        {"●".repeat(s.triesUsed)}
                        {"○".repeat(dash.triesPerRound - s.triesUsed)} {s.round > 1 ? `(${s.round}회차)` : ""}
                      </span>
                    )}
                    <div className="spacer" />
                    {idle && !s.completed && <span className="badge idle">멈춤</span>}
                  </div>
                  <div className="prompt">{s.lastAttempt ? s.lastAttempt.prompt : <span className="muted">아직 제출한 설명이 없어요</span>}</div>
                  {s.lastAttempt && (
                    <>
                      <div className="scorebar" style={{ height: 8 }}>
                        <div className={`fill ${s.lastAttempt.passed ? "pass" : ""}`} style={{ width: `${s.lastAttempt.score}%` }} />
                      </div>
                      <div className="row small muted">
                        <span>
                          최근 <b style={{ color: "var(--ink)" }}>{s.lastAttempt.score}점</b> (Lv{s.lastAttempt.level})
                        </span>
                        <div className="spacer" />
                        <span>{timeAgo(s.lastAttempt.at)}</span>
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {detail && (
        <div className="modal-bg" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <h2>
                {detail.student.number}. {detail.student.nickname}
              </h2>
              <span className={`badge ${detail.student.completed ? "ok" : ""}`}>{detail.student.completed ? "완료" : `Lv ${detail.student.level}`}</span>
              <div className="spacer" />
              <button className="btn danger sm" onClick={() => removeStudent(detail.student.id, `${detail.student.number}번`)}>
                학생 삭제
              </button>
              <button className="btn ghost sm" onClick={() => setDetail(null)}>
                닫기
              </button>
            </div>
            <p className="muted small">시간 순서대로 모든 시도를 보여 줍니다. 좋은 설명은 ⭐ 버튼으로 반 전체에 공유하세요.</p>
            {detail.attempts.length === 0 && <p className="muted">아직 시도가 없습니다.</p>}
            {detail.attempts.map((a) => (
              <div key={a.id} className={`att ${a.passed ? "pass" : ""}`}>
                <div className="row small">
                  <span className="badge">Lv{a.level}</span>
                  <span className="muted">
                    {a.round}회차 {a.tryNo}번째 · {new Date(a.at).toLocaleTimeString("ko-KR")} · {a.scorer === "gemini" ? "AI 채점" : "키워드 채점"}
                  </span>
                  <div className="spacer" />
                  <b>
                    {a.score}점 {a.passed ? "✅" : ""}
                  </b>
                  <button className="btn ghost sm" onClick={() => spotlight(a.id)}>
                    ⭐ 모두에게 보여주기
                  </button>
                </div>
                <p style={{ fontSize: "1.05rem", margin: "8px 0" }}>“{a.prompt}”</p>
                <div className="row" style={{ gap: 6 }}>
                  {a.found.map((f) => (
                    <span key={f} className="chip found">
                      ✔ {f}
                    </span>
                  ))}
                  {a.missing.map((f) => (
                    <span key={f} className="chip hidden">
                      {f}
                    </span>
                  ))}
                </div>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  학생에게 준 피드백: {a.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
