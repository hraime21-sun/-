// 연수·시연용: 실행 중인 서버에 '시연반'과 가상 학생 8명의 제출 기록을 만듭니다.
// 실행: npm run demo:seed   (BASE_URL 기본값 http://localhost:3000)
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = process.env.TEACHER_PASSWORD;

function client() {
  let cookie = "";
  return async (path, method = "GET", body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.()[0];
    if (set) cookie = set.split(";")[0];
    return res.json();
  };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const teacher = client();
await teacher("/api/teacher/login", "POST", { password: PASSWORD });
const { id, joinCode } = await teacher("/api/teacher/classes", "POST", { title: "시연반 (가상 학생)" });

const plans = [
  ["반짝별", ["빨간 사과", "초록 잎이 달린 빨간 사과", "하늘에 파란 풍선 세 개", "탁자 위 노란 컵 옆에 초록 책"]],
  ["구름빵", ["과일", "동그란 과일이 있다", "빨간 사과"]],
  ["달토끼", ["하얀 배경에 초록 잎 달린 빨간 사과 하나", "파란 풍선 3개가 구름 사이 하늘에 떠 있어요", "나무 탁자 위에 김이 나는 노란 컵, 그 옆에 초록 책", "공원 잔디밭에서 빨간 옷 아이가 노란 연을 날려요", "별이 빛나는 밤 바닷가 등대가 불빛을 비추는 고요한 수채화"]],
  ["코딩왕", ["사과", "빨간 사과가 있어요", "풍선 세 개"]],
  ["무지개", ["빨간 사과 한 개와 잎", "파란 풍선"]],
  ["해바라기", []],
  ["바다별", ["빨간 사과와 초록 잎", "하늘에 파란 풍선 세 개가 있어요", "컵이랑 책", "탁자 위에 컵이 있고 옆에 책이 있어요"]],
  ["새싹", ["사과"]],
];

await Promise.all(
  plans.map(async ([nick, prompts], i) => {
    const kid = client();
    await kid("/api/student/join", "POST", { code: joinCode, number: i + 1, nickname: nick });
    for (const p of prompts) {
      await kid("/api/student/attempt", "POST", { prompt: p });
      await sleep(3200);
    }
  }),
);
console.log(`시연반 준비 완료 → ${BASE}/teacher/${id}  (수업 코드 ${joinCode})`);
