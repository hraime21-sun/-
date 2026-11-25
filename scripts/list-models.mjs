// 내 Gemini API 키로 쓸 수 있는 모델 목록을 보여줍니다. (모델 이름이 바뀌었을 때 확인용)
// 실행: node --env-file=.env.local scripts/list-models.mjs
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY 가 없습니다.");
  process.exit(1);
}
let pageToken = "";
const rows = [];
do {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`, {
    headers: { "x-goog-api-key": key },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const json = await res.json();
  for (const m of json.models ?? []) rows.push(`${m.name.replace("models/", "")}  [${(m.supportedGenerationMethods ?? []).join(", ")}]`);
  pageToken = json.nextPageToken ?? "";
} while (pageToken);
console.log(rows.join("\n"));
