// 비밀값 유출 검사
//  1) git 에 올라갈 파일(추적 + 스테이징)에 API 키 모양 문자열이나 .env.local 의 실제 값이 있는지
//  2) 브라우저로 내려가는 빌드 결과물(.next/static)에 비밀값이 섞여 들어갔는지
//  3) .env.local / data/ 가 .gitignore 로 제외되는지
// 실행: npm run check:secrets   (git pre-commit 훅에서도 자동 실행)
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const problems = [];

const SECRET_KEYS = ["TEACHER_PASSWORD", "SESSION_SECRET", "GEMINI_API_KEY"];
const secrets = [];
if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && SECRET_KEYS.includes(m[1]) && m[2].trim().length >= 8) secrets.push({ name: m[1], value: m[2].trim() });
  }
}
const PATTERNS = [
  { name: "Google API 키", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Anthropic/OpenAI 키", re: /sk-(ant-)?[A-Za-z0-9_-]{20,}/ },
  { name: "개인 키", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function scanText(label, text) {
  for (const p of PATTERNS) if (p.re.test(text)) problems.push(`${label}: ${p.name} 모양의 문자열`);
  for (const s of secrets) if (text.includes(s.value)) problems.push(`${label}: .env.local 의 ${s.name} 실제 값`);
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return null;
  }
}

// 1) git 에 올라갈 파일
const isRepo = git("rev-parse --is-inside-work-tree") !== null;
if (isRepo) {
  const files = new Set(
    [git("ls-files") ?? "", git("diff --cached --name-only") ?? "", git("ls-files --others --exclude-standard") ?? ""]
      .join("\n")
      .split(/\r?\n/)
      .filter(Boolean),
  );
  for (const f of files) {
    if (!fs.existsSync(f) || fs.statSync(f).size > 2_000_000) continue;
    scanText(f, fs.readFileSync(f, "utf8"));
  }
  // 3) 꼭 제외돼야 하는 파일
  for (const f of [".env.local", ".env", "data/db.json"]) {
    if (git(`check-ignore -q ${f}`) === null) problems.push(`${f} 가 .gitignore 로 제외되지 않습니다`);
  }
} else {
  console.log("(git 저장소가 아니어서 1·3번 검사는 건너뜀)");
}

// 2) 브라우저로 가는 빌드 결과물
const staticDir = path.join(root, ".next", "static");
if (fs.existsSync(staticDir)) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(staticDir)) if (/\.(js|css|html|json)$/.test(f)) scanText(path.relative(root, f), fs.readFileSync(f, "utf8"));
} else {
  console.log("(.next/static 이 없어 빌드 결과 검사는 건너뜀 — npm run build 후 다시 실행)");
}

if (problems.length) {
  console.error("✘ 비밀값 유출 위험:\n  - " + [...new Set(problems)].join("\n  - "));
  process.exit(1);
}
console.log(`✔ 비밀값 유출 없음 (확인한 비밀값 ${secrets.length}개)`);
