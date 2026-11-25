// 학생 입력 안전 검사: 개인정보 패턴과 부적절한 말을 서버로 보내기 전에 막습니다.

export type SafetyResult = { ok: true; value: string } | { ok: false; reason: string };

const PII_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/, reason: "전화번호는 적지 않아요." },
  { re: /\d{6}\s*-\s*[1-4]\d{6}/, reason: "주민등록번호는 절대 적지 않아요." },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, reason: "이메일 주소는 적지 않아요." },
  { re: /\d+\s*동\s*\d+\s*호/, reason: "집 주소는 적지 않아요." },
  { re: /(아파트|빌라|번지)\s*\d+|\d+\s*번지/, reason: "집 주소는 적지 않아요." },
  // 도로명 주소(예: 행복로 12). "하늘로 3개" 같은 문장은 막지 않도록 두 자리 이상 번지만 봅니다.
  { re: /[가-힣]{2,}(로|길)\s*\d{2,}(?!\s*(개|마리|명|번째))/, reason: "집 주소는 적지 않아요." },
];

// 최소한의 금칙어 목록 (필요하면 학교 상황에 맞게 추가하세요)
const BANNED = ["시발", "씨발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "개새", "좆", "존나", "fuck", "shit", "bitch"];

function normalize(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

function containsBanned(text: string): boolean {
  const squashed = text.toLowerCase().replace(/[\s.\-_*]/g, "");
  return BANNED.some((w) => squashed.includes(w));
}

function checkPii(text: string): string | null {
  for (const p of PII_PATTERNS) if (p.re.test(text)) return p.reason;
  return null;
}

export const PROMPT_MIN = 2;
export const PROMPT_MAX = 150;

export function checkPrompt(raw: unknown): SafetyResult {
  if (typeof raw !== "string") return { ok: false, reason: "글을 입력해 주세요." };
  const value = normalize(raw);
  if (value.length < PROMPT_MIN) return { ok: false, reason: "조금 더 길게 설명해 볼까요?" };
  if (value.length > PROMPT_MAX) return { ok: false, reason: `${PROMPT_MAX}자 안으로 줄여 주세요.` };
  const pii = checkPii(value);
  if (pii) return { ok: false, reason: `🔒 ${pii} 그림에 보이는 것만 설명해요.` };
  if (containsBanned(value)) return { ok: false, reason: "고운 말로 다시 써 볼까요?" };
  return { ok: true, value };
}

export function checkNickname(raw: unknown): SafetyResult {
  if (typeof raw !== "string") return { ok: false, reason: "별명을 입력해 주세요." };
  const value = normalize(raw);
  if (value.length < 1 || value.length > 10) return { ok: false, reason: "별명은 1~10자로 써 주세요." };
  if (!/^[가-힣a-zA-Z0-9 ]+$/.test(value)) return { ok: false, reason: "별명은 한글, 영어, 숫자만 쓸 수 있어요." };
  if (/\d{4,}/.test(value)) return { ok: false, reason: "별명에 긴 숫자는 쓰지 않아요." };
  if (containsBanned(value)) return { ok: false, reason: "고운 별명을 지어 볼까요?" };
  return { ok: true, value };
}

export function checkStudentNumber(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 60) return null;
  return n;
}

export function checkTitle(raw: unknown): SafetyResult {
  if (typeof raw !== "string") return { ok: false, reason: "수업 이름을 입력해 주세요." };
  const value = normalize(raw);
  if (value.length < 1 || value.length > 40) return { ok: false, reason: "수업 이름은 1~40자로 써 주세요." };
  return { ok: true, value };
}
