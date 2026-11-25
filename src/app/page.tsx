"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [number, setNumber] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/student/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, number: Number(number), nickname }),
    });
    setBusy(false);
    if (res.ok) router.push("/play");
    else setError((await res.json()).error ?? "들어갈 수 없어요.");
  }

  return (
    <main className="wrap">
      <div className="hero">
        <section>
          <p className="chip">🖼️ 프롬프트 연습</p>
          <h1 style={{ marginTop: 12 }}>
            그림을 보고
            <br />
            말로 설명해 봐요!
          </h1>
          <p className="muted" style={{ fontSize: "1.05rem", lineHeight: 1.6 }}>
            AI에게 그림을 그려 달라고 하려면 무엇이 보이는지 자세히 말해야 해요.
            <br />
            그림 속 <b>숨은 요소</b>를 찾아 설명하고 레벨을 올려 보세요.
          </p>
          <div className="steps">
            <span className="chip">① 무엇이?</span>
            <span className="chip">② 어떤 색·모양·개수?</span>
            <span className="chip">③ 어디에?</span>
            <span className="chip">④ 무엇을 하나?</span>
            <span className="chip">⑤ 어떤 느낌·스타일?</span>
          </div>
        </section>
        <form className="card" onSubmit={join} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>수업 들어가기</h2>
          <div className="field">
            <label htmlFor="code">수업 코드</label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="예: AB3K7Q" maxLength={6} autoComplete="off" style={{ letterSpacing: 3, fontWeight: 800 }} />
          </div>
          <div className="row">
            <div className="field" style={{ width: 110 }}>
              <label htmlFor="num">번호</label>
              <input id="num" className="input" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} placeholder="7" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="nick">별명</label>
              <input id="nick" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10} placeholder="예: 반짝별" autoComplete="off" />
            </div>
          </div>
          <p className="notice">🔒 진짜 이름 대신 <b>별명</b>을 써요. 전화번호·주소 같은 개인정보는 어디에도 적지 않아요.</p>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy || !code || !number || !nickname}>
            {busy ? "들어가는 중…" : "시작하기 ▶"}
          </button>
          <a href="/teacher" className="small muted" style={{ textAlign: "right" }}>
            선생님 대시보드 →
          </a>
        </form>
      </div>
    </main>
  );
}
