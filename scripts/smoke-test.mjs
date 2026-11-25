// 통합 테스트: 실행 중인 서버(기본 http://localhost:3000)에 교사 1명 + 학생 3명을 흉내 내어 전체 흐름과 보안을 확인합니다.
// 실행: (다른 창에서 npm run dev 또는 npm start 후) npm run test:smoke
// 테스트로 만든 수업은 마지막에 삭제합니다.
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = process.env.TEACHER_PASSWORD;
if (!PASSWORD) throw new Error(".env.local 에 TEACHER_PASSWORD 가 필요합니다.");

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name} ${extra}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  let cookie = "";
  return async function req(path, { method = "GET", body, raw = false, headers = {} } = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const pair = c.split(";")[0];
      if (pair.endsWith("=")) cookie = "";
      else cookie = pair;
    }
    // res.text() 는 BOM 을 지워 버리므로 바이트로 받아 BOM 을 그대로 둡니다.
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer());
    let data = text;
    if (!raw) try { data = JSON.parse(text); } catch {}
    return { status: res.status, data, headers: res.headers, setCookie: set };
  };
}

console.log(`\n[통합 테스트] ${BASE}\n`);
const teacher = client();

console.log("교사 로그인 / 보안");
check("로그인 전에는 수업 목록 접근 불가(401)", (await teacher("/api/teacher/classes")).status === 401);
check("틀린 비밀번호 거부", (await teacher("/api/teacher/login", { method: "POST", body: { password: "wrong" } })).status === 401);
const login = await teacher("/api/teacher/login", { method: "POST", body: { password: PASSWORD } });
check("올바른 비밀번호로 로그인", login.status === 200);
check("세션 쿠키는 HttpOnly·SameSite", login.setCookie.some((c) => /HttpOnly/i.test(c) && /SameSite=lax/i.test(c)));
check("다른 사이트에서 온 요청 거부(CSRF)", (await teacher("/api/teacher/classes", { method: "POST", body: { title: "x" }, headers: { Origin: "https://evil.example" } })).status === 403);

const created = await teacher("/api/teacher/classes", { method: "POST", body: { title: "통합테스트반" } });
check("수업 만들기", created.status === 201 && /^[A-Z2-9]{6}$/.test(created.data.joinCode));
const { id: classId, joinCode } = created.data;

console.log("\n학생 입장");
const kids = [client(), client(), client()];
const names = ["반짝별", "구름빵", "달토끼"];
for (let i = 0; i < 3; i++) {
  const r = await kids[i]("/api/student/join", { method: "POST", body: { code: joinCode.toLowerCase(), number: i + 1, nickname: names[i] } });
  check(`${i + 1}번 ${names[i]} 입장 (코드 소문자도 허용)`, r.status === 200);
}
check("틀린 수업 코드 거부", (await client()("/api/student/join", { method: "POST", body: { code: "ZZZZZZ", number: 9, nickname: "누구" } })).status === 400);
check("같은 번호 다른 별명 거부", (await client()("/api/student/join", { method: "POST", body: { code: joinCode, number: 1, nickname: "가짜" } })).status === 409);
check("이상한 별명 거부", (await client()("/api/student/join", { method: "POST", body: { code: joinCode, number: 9, nickname: "<b>x</b>" } })).status === 400);

console.log("\n학생 권한 분리");
check("학생 쿠키로 교사 API 접근 불가", (await kids[0](`/api/teacher/classes/${classId}`)).status === 401);
check("학생 쿠키로 CSV 다운로드 불가", (await kids[0](`/api/teacher/classes/${classId}/export`)).status === 401);
const st = await kids[0]("/api/student/state");
check("학생 상태 조회", st.status === 200 && st.data.challenge.level === 1);
check("못 찾은 요소의 이름(정답)은 학생에게 보내지 않음", st.data.challenge.items.every((i) => i.label === null));
check("학생 응답에 그림 정답 설명이 없음", !JSON.stringify(st.data).includes("초록 잎이 달린"));

console.log("\n프롬프트 제출");
check("전화번호가 든 프롬프트 차단", (await kids[1]("/api/student/attempt", { method: "POST", body: { prompt: "010-1234-5678 사과" } })).status === 422);
let r = await kids[0]("/api/student/attempt", { method: "POST", body: { prompt: "하얀 배경에 초록 잎이 달린 빨간 사과 한 개" } });
check("1번: 자세한 설명 → 통과·레벨업", r.status === 200 && r.data.passed && r.data.levelUp, JSON.stringify(r.data));
check("너무 빠른 연속 제출 제한(3초)", (await kids[0]("/api/student/attempt", { method: "POST", body: { prompt: "풍선" } })).status === 429);
r = await kids[1]("/api/student/attempt", { method: "POST", body: { prompt: "과일" } });
check("2번: 짧은 설명 → 실패·힌트 피드백", r.status === 200 && !r.data.passed && r.data.feedback.length > 0, JSON.stringify(r.data));
r = await kids[2]("/api/student/attempt", { method: "POST", body: { prompt: "=HYPERLINK(\"x\") 빨간 사과" } });
check("3번: 수식처럼 생긴 글도 제출됨(내보낼 때 무력화)", r.status === 200);

console.log("\n교사 대시보드");
const dash = await teacher(`/api/teacher/classes/${classId}`);
check("학생 3명 표시", dash.data.students.length === 3);
check("1번 학생 레벨 2", dash.data.students.find((s) => s.number === 1)?.level === 2);
check("총 제출 3번 집계", dash.data.totalAttempts === 3, `(${dash.data.totalAttempts})`);
const s2 = dash.data.students.find((s) => s.number === 2);
const detail = await teacher(`/api/teacher/classes/${classId}/students/${s2.id}`);
check("학생 상세 기록 조회", detail.data.attempts.length === 1 && detail.data.attempts[0].prompt === "과일");

check("⭐ 모두에게 보여주기", (await teacher(`/api/teacher/classes/${classId}`, { method: "PATCH", body: { spotlightAttemptId: detail.data.attempts[0].id } })).status === 200);
check("학생 화면에 공유된 설명 표시", (await kids[2]("/api/student/state")).data.spotlight?.prompt === "과일");

await teacher(`/api/teacher/classes/${classId}`, { method: "PATCH", body: { locked: true } });
await sleep(3100);
check("⏸ 멈추기 상태에서는 제출 불가", (await kids[1]("/api/student/attempt", { method: "POST", body: { prompt: "빨간 사과" } })).status === 409);
await teacher(`/api/teacher/classes/${classId}`, { method: "PATCH", body: { locked: false } });

console.log("\n결과 다운로드");
const csv = await teacher(`/api/teacher/classes/${classId}/export?type=attempts`, { raw: true });
check("전체 기록 CSV (UTF-8 BOM)", csv.status === 200 && csv.data.charCodeAt(0) === 0xfeff && csv.data.includes("반짝별"));
check("CSV 수식 무력화", csv.data.includes("'=HYPERLINK"));
check("다운로드 파일 이름 지정", /attachment/.test(csv.headers.get("content-disposition") || ""));
const sum = await teacher(`/api/teacher/classes/${classId}/export?type=summary`, { raw: true });
check("요약 CSV", sum.status === 200 && sum.data.split("\r\n").length >= 4);

console.log("\n보안 헤더");
const home = await fetch(BASE + "/");
check("X-Frame-Options: DENY", home.headers.get("x-frame-options") === "DENY");
check("X-Powered-By 숨김", !home.headers.get("x-powered-by"));

console.log("\n정리");
check("수업 삭제", (await teacher(`/api/teacher/classes/${classId}`, { method: "DELETE" })).status === 200);
check("삭제 후 학생 세션 무효", (await kids[0]("/api/student/state")).status === 401);
check("로그아웃", (await teacher("/api/teacher/login", { method: "DELETE" })).status === 200);
check("로그아웃 후 접근 불가", (await teacher("/api/teacher/classes")).status === 401);

console.log(`\n결과: ${passed}개 통과, ${failed}개 실패\n`);
process.exit(failed ? 1 : 0);
