# 그림 보고 말해요 · 프롬프트 교실

초등학생이 **그림을 보고 한국어로 설명(프롬프트)하는 연습**을 하고, 선생님은 **실시간 대시보드**로 과정을 보고 결과를 CSV로 내려받는 웹앱입니다.

- 학생: 수업 코드 + 번호 + 별명으로 입장 → 레벨 1~5 그림 설명 → 점수·힌트 피드백 → 통과하면 레벨업
- 교사: 학생 카드 격자(한 줄 학생 수 조절), 진행 상태 아이콘, 완료 진행률, 레벨 분포, 학생별 전체 기록, ⭐ 좋은 설명 모두에게 공유, ⏸ 모두 멈추기, CSV 내려받기(요약 / 전체 기록), 수업·학생 삭제

## 1. 처음 실행

```powershell
npm install
copy .env.example .env.local   # 그리고 .env.local 값 채우기 (이미 만들어져 있으면 생략)
npm run dev                    # http://localhost:3000
```

- 학생 화면: `http://localhost:3000`
- 교사 대시보드: `http://localhost:3000/teacher` (비밀번호는 `.env.local` 의 `TEACHER_PASSWORD`)

## 2. Gemini 연결 (AI 채점 + 그림 미리 만들기)

1. https://aistudio.google.com/apikey 에서 Google 계정으로 API 키를 발급합니다.
2. `.env.local` 의 `GEMINI_API_KEY=` 뒤에 붙여 넣습니다. (**`.env.local` 은 git 에 올라가지 않습니다.**)
3. 연습 그림을 AI로 만듭니다:
   ```powershell
   npm run images:generate
   ```
   `public/challenges/*.png` 가 생기면 앱이 기본 SVG 대신 그 그림을 씁니다. **생성된 그림은 수업 전에 꼭 직접 확인하세요.**
   다시 만들려면 `npm run images:generate -- --force`.
4. 서버를 다시 시작하면 채점이 '키워드 채점' → 'AI 채점(Gemini) + 키워드'로 바뀝니다. AI 호출이 실패하면 자동으로 키워드 채점으로 대신합니다.

> 모델 이름은 `.env.local` 의 `GEMINI_MODEL`(채점, 기본 `gemini-3.5-flash-lite`)과 `IMAGEN_MODEL`(그림, 기본 `gemini-3.1-flash-image`)로 바꿉니다.
> 내 키로 쓸 수 있는 모델 목록: `node --env-file=.env.local scripts/list-models.mjs`
>
> ⚠️ **그림 생성 모델은 무료 요금제에서 쓸 수 없습니다(한도 0).** Google AI Studio에서 결제를 연결해야 `images:generate` 가 동작합니다. 채점 모델은 무료로 동작합니다.

### AI 채점 안전장치
- 학생 글에 "지시 무시", "점수", "matched" 같은 채점 조작 말이 있으면 AI 에 보내지 않고 키워드 채점만 합니다.
- AI 가 인정한 요소마다 학생 글에서 그대로 옮긴 근거가 있어야 하며, 서버가 직접 대조해 근거가 없으면 버립니다.
- AI 힌트에 아직 못 찾은 정답 낱말이 들어 있으면 그 힌트는 버리고 기본 힌트를 씁니다.
- 점검: 서버를 켠 뒤 `node --env-file=.env.local scripts/ai-check.mjs`

## 3. 레벨·그림 바꾸기

`src/lib/challenges.ts` 에서 레벨마다 그림 설명, 통과 점수, **숨은 요소 체크리스트**(요소 이름·힌트·인정할 낱말)를 고칩니다.
그림 생성 프롬프트(`genPrompt`)를 바꾼 뒤 `npm run images:generate -- --force` 로 다시 만듭니다.

## 4. 개인정보·보안 규칙

| 규칙 | 구현 |
|---|---|
| 최소 수집 | 학생은 번호 + 별명만. 실명·이메일·연락처를 받지 않음 |
| 개인정보 입력 차단 | 전화번호·주민번호·이메일·주소 모양의 글, 욕설은 서버에서 거부 (`src/lib/safety.ts`) |
| 비밀값 분리 | 키·비밀번호는 `.env.local` 에만. `NEXT_PUBLIC_` 접두사를 쓰지 않아 브라우저로 내려가지 않음 |
| git 유출 방지 | `.gitignore` 로 `.env*`, `data/`, `*.csv` 제외 + 커밋 전 훅(`.githooks/pre-commit`)이 비밀값 검사 |
| 권한 분리 | 서명된 HttpOnly 쿠키 세션. 학생은 자기 기록만, 교사 API 는 교사만. 정답 체크리스트는 학생에게 보내지 않음 |
| CSRF·남용 방지 | 다른 사이트에서 온 요청 거부, 로그인 시도 제한, 학생 제출 3초 간격·반 전체 분당 제한 |
| AI 로 보내는 정보 | 학생 프롬프트 글만 전송 (이름·번호 없음). 학생 글 속 지시문은 무시하도록 지시 |
| 보존 기간 | 수업 생성 후 `RETENTION_DAYS`(기본 30일)가 지나면 자동 삭제. 대시보드에서 즉시 삭제 가능 |
| CSV 안전 | UTF-8 BOM(엑셀 한글), `=`·`+`·`-`·`@` 로 시작하는 칸은 수식이 실행되지 않게 처리 |

## 5. 테스트

```powershell
npm test               # 단위 테스트 (채점, 개인정보 필터, 세션 위조, 게임 규칙, CSV)
npm run build          # 타입 검사 + 빌드
npm run check:secrets  # git 에 올라갈 파일과 빌드 결과물에 비밀값이 없는지
npm start              # (다른 창) 빌드한 서버 실행
npm run test:smoke     # 통합 테스트: 교사 1명 + 학생 3명 전체 흐름·권한·다운로드
npm run demo:seed      # (선택) 연수 시연용 가상 학생 8명 반 만들기
```

## 6. 구조

```
src/lib/challenges.ts   레벨·그림·숨은 요소
src/lib/scoring.ts      키워드 채점 / src/lib/gemini.ts  Gemini 채점
src/lib/game.ts         3번 기회·라운드·레벨업 규칙
src/lib/store.ts        JSON 파일 저장소 (data/db.json)
src/lib/safety.ts       입력 검사 / session.ts 세션 / csv.ts 내보내기
src/app/                학생(/ , /play), 교사(/teacher, /teacher/[id]), API(/api/...)
```

## 7. 알아 둘 점 / 다음 단계

- 지금 저장소는 **서버 1대용 JSON 파일**입니다. 교실 PC 한 대로 서버를 켜고 학생들이 같은 네트워크로 접속하는 방식에 맞습니다.
  인터넷에 배포(Vercel 등)하려면 저장소를 Supabase/Postgres 로 바꿔야 합니다 (`src/lib/store.ts` 만 교체).
- 교사 계정은 1개(비밀번호 1개)입니다. 여러 선생님이 함께 쓰려면 교사 계정 기능이 필요합니다.
- 이미지 생성 채점(B 모드)은 아직 넣지 않았습니다.
