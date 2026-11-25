// 레벨 그림을 Google Imagen 으로 미리 만들어 public/challenges/<id>.png 로 저장합니다.
// 실행: npm run images:generate          (이미 있는 PNG 는 건너뜀)
//       npm run images:generate -- --force   (모두 다시 생성)
// PNG 가 있으면 앱은 SVG 대신 PNG 를 보여주고, Gemini 채점 때 그림도 함께 보냅니다.
import fs from "node:fs";
import path from "node:path";
import { CHALLENGES } from "../src/lib/challenges.ts";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY 가 없습니다. .env.local 에 키를 넣은 뒤 다시 실행하세요.");
  process.exit(1);
}
// imagen-* 모델은 predict, 그 밖의 Gemini 이미지 모델(gemini-*-image)은 generateContent 로 부릅니다.
// 내 키로 쓸 수 있는 모델 확인: node --env-file=.env.local scripts/list-models.mjs
const model = process.env.IMAGEN_MODEL || "gemini-3.1-flash-image";
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function generate(prompt) {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
  const headers = { "Content-Type": "application/json", "x-goog-api-key": key };
  if (model.startsWith("imagen")) {
    const res = await fetch(`${base}:predict`, {
      method: "POST",
      headers,
      body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1" } }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const p = (await res.json()).predictions?.[0];
    return p?.bytesBase64Encoded ? { data: p.bytesBase64Encoded, mime: p.mimeType || "image/png" } : null;
  }
  const res = await fetch(`${base}:generateContent`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${prompt}. Square image. No text, letters or watermarks in the image.` }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const parts = (await res.json()).candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData || p.inline_data);
  const d = img?.inlineData || img?.inline_data;
  return d ? { data: d.data, mime: d.mimeType || d.mime_type || "image/png" } : null;
}
const force = process.argv.includes("--force");
const outDir = path.join(process.cwd(), "public", "challenges");
fs.mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const c of CHALLENGES) {
  const existing = Object.values(EXT).map((e) => path.join(outDir, `${c.id}.${e}`)).filter((f) => fs.existsSync(f));
  if (existing.length && !force) {
    console.log(`건너뜀  ${path.basename(existing[0])} (이미 있음)`);
    continue;
  }
  process.stdout.write(`생성 중 ${c.id} ... `);
  try {
    const img = await generate(c.genPrompt);
    if (!img) throw new Error("응답에 그림이 없습니다 (안전 필터에 걸렸을 수 있음).");
    const ext = EXT[img.mime] ?? "png";
    for (const f of existing) fs.rmSync(f);
    fs.writeFileSync(path.join(outDir, `${c.id}.${ext}`), Buffer.from(img.data, "base64"));
    console.log(`완료 (${c.id}.${ext})`);
  } catch (e) {
    failed++;
    console.log(`실패: ${e.message}`);
  }
}
console.log(failed ? `\n${failed}개 실패. 실패한 그림은 기본 SVG 그림이 대신 쓰입니다.` : "\n모든 그림 준비 완료! 생성된 그림을 직접 확인한 뒤 수업에 쓰세요.");
process.exit(failed ? 1 : 0);
