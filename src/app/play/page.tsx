"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; found: boolean; label: string | null };
type State = {
  student: { number: number; nickname: string; level: number; completed: boolean };
  class: { title: string; locked: boolean };
  spotlight: { nickname: string; prompt: string; score: number; at: number } | null;
  maxLevel: number;
  triesPerRound: number;
  challenge: { id: string; level: number; title: string; goal: string; passScore: number; image: string; items: Item[] } | null;
  round: number;
  triesLeft: number;
  revealedHints: string[];
  attempts: { id: string; round: number; tryNo: number; prompt: string; score: number; feedback: string; passed: boolean }[];
};
type Result = { score: number; passed: boolean; feedback: string; levelUp: boolean; completed: boolean; roundOver: boolean; passScore: number };

const MAX = 150;

export default function Play() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [celebrate, setCelebrate] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/student/state", { cache: "no-store" });
    if (res.status === 401) return router.replace("/");
    if (res.ok) setState(await res.json());
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // 선생님의 잠금·공유를 반영하기 위해 주기적으로 확인
    return () => clearInterval(t);
  }, [load]);

  async function submit() {
    if (!state?.challenge) return;
    setBusy(true);
    setError("");
    const passScore = state.challenge.passScore;
    const res = await fetch("/api/student/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "다시 해 볼까요?");
    const r: Result = { ...body, passScore };
    if (r.passed) {
      setCelebrate(r);
      setResult(null);
      setPrompt("");
    } else setResult(r);
    load();
  }

  async function leave() {
    await fetch("/api/student/join", { method: "DELETE" });
    router.replace("/");
  }

  if (!state) return <main className="wrap muted">불러오는 중…</main>;
  const { student, challenge } = state;

  return (
    <main className="wrap">
      <div className="topbar">
        <b style={{ fontSize: "1.1rem" }}>
          {student.number}번 {student.nickname}
        </b>
        <span className="muted small">{state.class.title}</span>
        <div className="spacer" />
        <div className="levels" aria-label="레벨 진행">
          {Array.from({ length: state.maxLevel }, (_, i) => {
            const lv = i + 1;
            const cls = student.completed || lv < student.level ? "done" : lv === student.level ? "now" : "";
            return (
              <span key={lv} className={`lv ${cls}`}>
                {lv}
              </span>
            );
          })}
        </div>
        <button className="btn ghost sm" onClick={leave}>
          나가기
        </button>
      </div>

      {state.spotlight && (
        <div className="spot">
          ⭐ <b>선생님이 고른 멋진 설명</b> · {state.spotlight.nickname} ({state.spotlight.score}점)
          <div style={{ marginTop: 6, fontSize: "1.1rem" }}>“{state.spotlight.prompt}”</div>
        </div>
      )}
      {state.class.locked && <div className="notice" style={{ marginBottom: 16 }}>⏸ 선생님이 잠시 멈췄어요. 앞 화면을 봐 주세요.</div>}

      {celebrate ? (
        <div className="card celebrate">
          <div className="big">{celebrate.completed ? "🏆" : "🎉"}</div>
          <h2>{celebrate.completed ? "모든 레벨 완료!" : "통과! 다음 레벨로!"}</h2>
          <p style={{ fontSize: "1.2rem" }}>{celebrate.score}점</p>
          <p className="muted">{celebrate.feedback}</p>
          {!celebrate.completed && (
            <button className="btn" onClick={() => setCelebrate(null)}>
              다음 그림 보기 ▶
            </button>
          )}
        </div>
      ) : !challenge ? (
        <div className="card celebrate">
          <div className="big">🏆</div>
          <h2>모든 레벨을 완료했어요!</h2>
          <p className="muted">친구가 끝날 때까지 기다려 주세요. 선생님이 고른 설명도 읽어 봐요.</p>
        </div>
      ) : (
        <div className="play">
          <section>
            <img className="picture" src={challenge.image} alt="설명할 그림" />
            <p className="muted small" style={{ marginTop: 8 }}>
              🎯 {state.revealedHints.length > 0 ? "힌트를 참고해 다시 도전!" : "숨은 요소를 찾아 설명해요."}
            </p>
            <div className="row" style={{ gap: 6 }}>
              {challenge.items.map((it, i) =>
                it.found ? (
                  <span key={it.id} className="chip found">
                    ✔ {it.label}
                  </span>
                ) : (
                  <span key={it.id} className="chip hidden">
                    ? 숨은 요소 {i + 1}
                  </span>
                ),
              )}
            </div>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2>{challenge.title}</h2>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {challenge.goal} <b>통과 점수 {challenge.passScore}점</b>
              </p>
            </div>
            <div className="row">
              <span className="hearts" aria-label={`남은 기회 ${state.triesLeft}번`}>
                {"❤️".repeat(state.triesLeft)}
                {"🤍".repeat(state.triesPerRound - state.triesLeft)}
              </span>
              <span className="muted small">
                {state.round}번째 도전 · 남은 기회 {state.triesLeft}번
              </span>
            </div>
            {state.revealedHints.map((h) => (
              <div key={h} className="notice">
                🔑 힌트: {h}
              </div>
            ))}
            <div>
              <textarea
                className="prompt-box"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, MAX))}
                placeholder="그림에 무엇이 보이나요? 무엇이, 어떤 색으로, 어디에, 무엇을 하고 있는지 설명해 보세요."
                disabled={busy || state.class.locked}
              />
              <div className="row small muted">
                <span>
                  {prompt.length}/{MAX}자
                </span>
                <div className="spacer" />
                <button className="btn" onClick={submit} disabled={busy || state.class.locked || prompt.trim().length < 2}>
                  {busy ? "채점 중…" : "제출하기"}
                </button>
              </div>
            </div>
            {error && <p className="error">{error}</p>}

            {result && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="row">
                  <b style={{ fontSize: "1.4rem" }}>{result.score}점</b>
                  <span className="muted small">/ 통과 {result.passScore}점</span>
                </div>
                <div className="scorebar">
                  <div className="fill" style={{ width: `${result.score}%` }} />
                  <div className="goal" style={{ left: `${result.passScore}%` }} />
                </div>
                <div className="feedback try">{result.feedback}</div>
                {result.roundOver && <p className="small muted">기회를 모두 썼어요. 힌트가 하나 열렸어요! 새 기회 3번으로 다시 도전해요.</p>}
              </div>
            )}

            {state.attempts.length > 0 && (
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>내가 쓴 설명</h3>
                <div className="history">
                  {[...state.attempts].reverse().map((a) => (
                    <div key={a.id} className="item">
                      <span className="badge">
                        {a.round}-{a.tryNo}
                      </span>{" "}
                      <b>{a.score}점</b> · {a.prompt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
