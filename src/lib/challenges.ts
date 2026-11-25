// 레벨별 연습 그림과 '숨은 요소' 체크리스트.
// keywords 는 학생 프롬프트에 그 말(또는 비슷한 말)이 들어 있으면 요소를 찾은 것으로 봅니다.
// 한국어는 조사가 붙으므로("사과가", "사과를") 부분 문자열로 비교합니다.

export type ChecklistItem = {
  id: string;
  label: string; // 학생에게 보여줄 요소 이름 (찾았을 때만 공개)
  hint: string; // 못 찾았을 때 주는 힌트 질문
  keywords: string[];
  weight: number;
};

export type Challenge = {
  id: string; // public/challenges/<id>.png 또는 .svg
  level: number;
  title: string;
  goal: string; // 이번 레벨에서 연습할 것
  passScore: number; // 0~100
  description: string; // 그림의 정답 설명 (AI 채점 기준, 학생에게는 비공개)
  genPrompt: string; // Imagen 으로 그림을 미리 만들 때 쓰는 프롬프트
  checklist: ChecklistItem[];
};

export const CHALLENGES: Challenge[] = [
  {
    id: "lv1-apple",
    level: 1,
    title: "레벨 1 · 무엇이 보이나요?",
    goal: "그림의 주인공과 색깔을 말해 봐요.",
    passScore: 50,
    description: "하얀 배경 가운데에 초록 잎이 달린 빨간 사과 한 개가 있다.",
    genPrompt:
      "A single shiny red apple with one green leaf on its stem, centered on a plain white background, simple children's book illustration, flat colors",
    checklist: [
      { id: "subject", label: "사과", hint: "그림의 주인공은 무엇일까요?", keywords: ["사과", "apple", "과일"], weight: 4 },
      { id: "color", label: "빨간색", hint: "주인공은 무슨 색인가요?", keywords: ["빨간", "빨강", "붉은", "빨갛", "red"], weight: 3 },
      { id: "leaf", label: "초록 잎", hint: "꼭지에 무엇이 달려 있나요?", keywords: ["잎", "나뭇잎", "이파리", "leaf"], weight: 2 },
      { id: "bg", label: "하얀 배경", hint: "뒤쪽(배경)은 무슨 색인가요?", keywords: ["하얀 배경", "흰 배경", "흰색 배경", "하얀색 배경", "배경은 하얀", "배경이 하얀", "배경은 흰", "white"], weight: 1 },
    ],
  },
  {
    id: "lv2-balloons",
    level: 2,
    title: "레벨 2 · 몇 개, 어떤 모양?",
    goal: "개수와 모양을 함께 말해 봐요.",
    passScore: 60,
    description: "하늘색 배경에 동그란 파란 풍선 세 개가 끈을 달고 떠 있다. 작은 흰 구름이 있다.",
    genPrompt:
      "Three round blue balloons with strings floating in a light blue sky with small white clouds, simple children's book illustration, flat colors",
    checklist: [
      { id: "subject", label: "풍선", hint: "하늘에 떠 있는 것은 무엇일까요?", keywords: ["풍선", "balloon"], weight: 3 },
      { id: "count", label: "세 개", hint: "모두 몇 개인지 세어 볼까요?", keywords: ["세 개", "세개", "3개", "3 개", "세 풍선", "풍선 세", "풍선 3", "three", "셋"], weight: 3 },
      { id: "color", label: "파란색", hint: "풍선은 무슨 색인가요?", keywords: ["파란", "파랑", "푸른", "blue"], weight: 2 },
      { id: "sky", label: "하늘", hint: "풍선은 어디에 있나요?", keywords: ["하늘", "sky", "떠 있", "떠있", "날아"], weight: 1 },
      { id: "cloud", label: "구름", hint: "하늘에 또 무엇이 있나요?", keywords: ["구름", "cloud"], weight: 1 },
    ],
  },
  {
    id: "lv3-cup-book",
    level: 3,
    title: "레벨 3 · 어디에 있나요?",
    goal: "물건들의 위치(위, 옆, 아래)를 말해 봐요.",
    passScore: 65,
    description: "갈색 나무 탁자 위에 김이 나는 노란 컵이 있고, 컵 옆에 초록색 책이 놓여 있다.",
    genPrompt:
      "A yellow mug with rising steam on a brown wooden table, and a green closed book lying next to the mug, simple children's book illustration, flat colors, plain background",
    checklist: [
      { id: "cup", label: "컵", hint: "마실 것을 담는 물건이 보이나요?", keywords: ["컵", "머그", "잔", "cup", "mug"], weight: 2 },
      { id: "book", label: "책", hint: "컵 말고 또 어떤 물건이 있나요?", keywords: ["책", "book"], weight: 2 },
      { id: "table", label: "탁자", hint: "물건들은 무엇 위에 놓여 있나요?", keywords: ["탁자", "테이블", "책상", "식탁", "table"], weight: 2 },
      { id: "on", label: "탁자 위에", hint: "물건들은 탁자의 위? 아래?", keywords: ["위에", "위의", "위로", "on the"], weight: 2 },
      { id: "beside", label: "옆에", hint: "책은 컵의 어디에 있나요?", keywords: ["옆", "곁", "나란히", "next to", "beside"], weight: 2 },
      { id: "steam", label: "김(따뜻함)", hint: "컵에서 무엇이 올라오나요?", keywords: ["김", "연기", "따뜻", "뜨거", "steam"], weight: 1 },
      { id: "colors", label: "노란 컵·초록 책", hint: "컵과 책은 무슨 색인가요?", keywords: ["노란", "노랑", "초록", "녹색", "yellow", "green"], weight: 1 },
    ],
  },
  {
    id: "lv4-kite",
    level: 4,
    title: "레벨 4 · 무엇을 하고 있나요?",
    goal: "누가, 어디서, 무엇을 하는지 말해 봐요.",
    passScore: 70,
    description: "푸른 잔디밭 공원에서 빨간 옷을 입은 아이가 하늘 높이 노란 연을 날리고 있다. 뒤에 나무가 있고 해가 떠 있다.",
    genPrompt:
      "A child in a red shirt flying a yellow diamond kite high in the sky in a green grassy park with a tree and a bright sun, simple children's book illustration, flat colors",
    checklist: [
      { id: "child", label: "아이", hint: "그림 속 사람은 누구인가요?", keywords: ["아이", "어린이", "소년", "소녀", "친구", "학생", "남자", "여자", "child", "kid", "boy", "girl"], weight: 2 },
      { id: "kite", label: "연", hint: "하늘에 무엇이 날고 있나요?", keywords: ["연을", "연이", "연 ", "가오리연", "방패연", "kite"], weight: 2 },
      { id: "action", label: "연을 날린다", hint: "아이는 무엇을 하고 있나요?", keywords: ["날리", "날려", "날린", "flying", "fly"], weight: 3 },
      { id: "park", label: "공원·잔디밭", hint: "여기는 어디일까요?", keywords: ["공원", "잔디", "풀밭", "들판", "park", "grass"], weight: 2 },
      { id: "clothes", label: "빨간 옷", hint: "아이는 무슨 색 옷을 입었나요?", keywords: ["빨간 옷", "빨간색 옷", "빨간 티", "빨간 셔츠", "빨간옷", "red shirt"], weight: 1 },
      { id: "tree-sun", label: "나무와 해", hint: "배경에 또 무엇이 있나요?", keywords: ["나무", "해가", "해 ", "태양", "햇", "tree", "sun"], weight: 1 },
    ],
  },
  {
    id: "lv5-lighthouse",
    level: 5,
    title: "레벨 5 · 어떤 느낌인가요?",
    goal: "분위기와 그림 스타일까지 말해 봐요.",
    passScore: 75,
    description: "별이 빛나는 밤, 바닷가 바위 위에 빨간 줄무늬 등대가 노란 불빛을 비추고 있다. 수채화 느낌의 고요한 분위기.",
    genPrompt:
      "A red and white striped lighthouse on rocks by the sea at night, shining a warm yellow beam, starry dark blue sky, calm peaceful mood, soft watercolor painting style",
    checklist: [
      { id: "lighthouse", label: "등대", hint: "높이 서 있는 건물은 무엇일까요?", keywords: ["등대", "lighthouse"], weight: 2 },
      { id: "sea", label: "바다", hint: "등대 주변에는 무엇이 있나요?", keywords: ["바다", "바닷", "파도", "물결", "해변", "sea", "ocean"], weight: 2 },
      { id: "night", label: "밤", hint: "낮일까요, 밤일까요?", keywords: ["밤", "저녁", "어두", "night"], weight: 2 },
      { id: "stars", label: "별", hint: "하늘에 반짝이는 것은?", keywords: ["별", "star"], weight: 1 },
      { id: "light", label: "불빛", hint: "등대에서 무엇이 나오나요?", keywords: ["불빛", "빛", "비추", "비치", "light", "beam"], weight: 1 },
      { id: "mood", label: "고요한 분위기", hint: "그림은 어떤 느낌을 주나요?", keywords: ["고요", "조용", "평화", "잔잔", "차분", "포근", "신비", "calm", "peaceful", "quiet"], weight: 2 },
      { id: "style", label: "수채화 스타일", hint: "어떤 방법으로 그린 그림 같나요?", keywords: ["수채화", "물감", "그림체", "watercolor"], weight: 2 },
    ],
  },
];

export const MAX_LEVEL = CHALLENGES.length;
export const TRIES_PER_ROUND = 3;

export function challengeForLevel(level: number): Challenge | undefined {
  return CHALLENGES.find((c) => c.level === level);
}

export function challengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
