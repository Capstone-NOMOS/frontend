import type { Document } from "@/entities/document";
import type { Event } from "@/entities/event";
import type { Message } from "@/entities/message";
import type { Task } from "@/entities/task";
import type { AppState } from "../store";

const DAY = "2026-09-20";
const t = (hm: string) => `${DAY}T${hm}:00+09:00`;

export const IDS = {
  owner: "u_owner",
  fe: "u_fe",
  be: "u_be",
  feAgent: "a_fe",
  beAgent: "a_be",
  project: "p_jazzify",
  room1: "r_jazzify_fe",
  room2: "r_jazzify_be",
  room3: "r_jazzify_owner",
};

const CONSTITUTION = `# Jazzify 헌법

> 프로젝트의 확정된 규칙. **대표만** 수정할 수 있으며, 모든 에이전트는 작업 시작 전 \`get_constitution()\`으로 이 문서를 읽습니다.

## 스택
- FE: Next.js 16 (App Router) · TypeScript · Tailwind v4
- BE: FastAPI · SQLAlchemy · PostgreSQL 16
- 패키지 매니저: pnpm (FE) / uv (BE)

## 컨벤션
- 커밋 메시지: \`feat|fix|chore|refactor: 한글 요약\`
- API 경로는 \`/api/v1/*\`, 응답은 camelCase JSON
- FE 컴포넌트는 \`src/components/<domain>/\` 아래에 둔다
- 테스트: FE는 Vitest, BE는 pytest. 기능마다 최소 1개

## 금지사항
- 다른 역할의 레포를 수정하지 않는다 (\`scope:violation\`)
- \`.env*\`, \`*.pem\` 파일에 접근하지 않는다
- main 브랜치에 직접 push 하지 않는다 — PR은 사람이 머지한다
`;

const SPEC_V1 = `# 명세 v1 — 즐겨찾기 · 유사곡 추천

> 상태: **LOCKED** · 승인: 최영현 (대표) · 2026-09-20 13:12

## F-01 곡 즐겨찾기
- AC1: WHEN 곡 상세에서 ♥ 클릭 THEN 즐겨찾기에 추가된다
- AC2: WHEN 이미 즐겨찾기된 곡 THEN ♥가 채워져 표시된다
- AC3: WHEN 즐겨찾기 해제 THEN 목록에서 제거된다

## F-02 유사곡 추천
- AC1: WHEN 즐겨찾기 3곡 이상 THEN 추천 탭이 활성화된다
- AC2: WHEN 추천 탭 진입 THEN 10곡이 유사도 순으로 표시된다
- AC3: WHEN 추천 결과가 없으면 THEN "이런 곡은 어때요?" 대신 빈 상태 문구를 보여준다

## 태스크
| ID | 역할 | 제목 |
| --- | --- | --- |
| T-01 | BE | 즐겨찾기 API |
| T-02 | BE | 추천 API |
| T-03 | FE | ♥ 버튼 |
| T-04 | FE | 추천 탭 |

## 결정이 필요한 것
- 추천 알고리즘 → BE 결정 (ADR-003)
- 즐겨찾기 상한 → 대표 결정: **없음** (ADR-002)
`;

const CONTRACT_V1 = `# 계약 v1 — 즐겨찾기 · 추천 API

> 양쪽 Room에 **동일한 텍스트**로 전달됩니다. 변경은 \`contract:change\` 정책(L2: 사람 승인)을 따릅니다.

## POST /api/v1/favorites
\`\`\`json
// request
{ "songId": "string" }
// 201
{ "id": "string", "songId": "string", "createdAt": "ISO-8601" }
// 409  이미 즐겨찾기됨
\`\`\`

## DELETE /api/v1/favorites/{id}
\`\`\`json
// 204  본문 없음
\`\`\`

## GET /api/v1/recommendations
\`\`\`json
// 200
{ "songs": [ { "id": "string", "title": "string", "artist": "string", "score": 0.0 } ] }
// 412  즐겨찾기 3곡 미만
\`\`\`
`;

const ADR = (n: string, title: string, by: string, when: string, body: string) =>
  `## ${n} ${title}\n\n- 결정자: ${by}\n- 시각: ${when}\n\n${body}\n`;

const ADR_DOC = `# 결정기록 (ADR)

> 에이전트가 사람에게 물어본 질문과 답이 **자동으로** 여기에 남습니다. 다음 에이전트는 같은 질문을 하기 전에 \`search_decisions()\`로 먼저 조회합니다.

${ADR("ADR-001", "즐겨찾기 저장소는 PostgreSQL 테이블", "오영훈 (BE)", "2026-09-20 13:20", "Redis 캐시 없이 단일 테이블 `favorites(user_id, song_id, created_at)`. 이유: 데모 규모에서 캐시는 불필요.")}
${ADR("ADR-002", "즐겨찾기 상한 없음", "최영현 (대표)", "2026-09-20 13:12", "명세 승인 시 결정. 상한을 두면 UX가 복잡해지고 데모 목적에 맞지 않음.")}
`;

const messages: Message[] = [
  // ---------- Room 3 (대표 + PM) ----------
  {
    id: "m_r3_01",
    roomId: IDS.room3,
    authorType: "system",
    ts: t("12:58"),
    card: {
      kind: "notice",
      tone: "info",
      text: "Room 3가 열렸습니다. 대표와 PM만 이 방에 있습니다. 요구사항을 한 문장으로 적어주세요.",
    },
  },
  {
    id: "m_r3_02",
    roomId: IDS.room3,
    authorType: "user",
    authorId: IDS.owner,
    ts: t("13:02"),
    text: "사용자가 좋아하는 재즈 곡을 저장하고 비슷한 곡을 추천받는 기능",
  },
  {
    id: "m_r3_03",
    roomId: IDS.room3,
    authorType: "pm",
    ts: t("13:03"),
    text: "요구사항을 기능 명세로 정리했습니다. 승인하시면 명세를 문서에 v1으로 잠그고, 태스크를 양쪽 Room에 동시에 전달합니다.",
    card: {
      kind: "spec",
      version: 1,
      title: "즐겨찾기 · 유사곡 추천",
      features: [
        {
          id: "F-01",
          title: "곡 즐겨찾기",
          acs: [
            "WHEN 곡 상세에서 ♥ 클릭 THEN 즐겨찾기에 추가",
            "WHEN 이미 즐겨찾기된 곡 THEN ♥가 채워져 표시",
            "WHEN 즐겨찾기 해제 THEN 목록에서 제거",
          ],
        },
        {
          id: "F-02",
          title: "유사곡 추천",
          acs: ["WHEN 즐겨찾기 3곡 이상 THEN 추천 탭 활성화", "WHEN 추천 탭 진입 THEN 10곡이 유사도 순으로 표시"],
        },
      ],
      contract: [
        "POST /api/v1/favorites  { songId } → 201 { id, songId, createdAt }",
        "DELETE /api/v1/favorites/{id} → 204",
        "GET /api/v1/recommendations → 200 { songs: [...] }",
      ],
      tasks: [
        { id: "T-01", title: "즐겨찾기 API", role: "BE" },
        { id: "T-02", title: "추천 API", role: "BE" },
        { id: "T-03", title: "♥ 버튼", role: "FE" },
        { id: "T-04", title: "추천 탭", role: "FE" },
      ],
      decisions: [
        { text: "추천 알고리즘: 장르 기반? 협업 필터링? → BE에게 물어보겠습니다", owner: "BE" },
        { text: "즐겨찾기 상한: 없음? 100곡? → 대표님 결정 필요", owner: "OWNER" },
      ],
      status: "approved",
      revisions: 0,
    },
  },
  {
    id: "m_r3_04",
    roomId: IDS.room3,
    authorType: "user",
    authorId: IDS.owner,
    ts: t("13:11"),
    text: "즐겨찾기 상한은 없음으로 가자. 승인.",
  },
  {
    id: "m_r3_05",
    roomId: IDS.room3,
    authorType: "pm",
    ts: t("13:12"),
    text: "승인됐습니다. 명세를 v1으로 저장하고(LOCKED), 계약 초안과 함께 태스크 4개를 Room 1·2에 동시에 전달했습니다. 즐겨찾기 상한 결정은 ADR-002로 기록했습니다.",
  },
  {
    id: "m_r3_06",
    roomId: IDS.room3,
    authorType: "system",
    ts: t("13:13"),
    card: { kind: "notice", tone: "success", text: "명세 v1 · 계약 v1 저장됨 — 문서 페이지에서 확인할 수 있습니다." },
  },
  {
    id: "m_r3_07",
    roomId: IDS.room3,
    authorType: "pm",
    ts: t("14:02"),
    card: {
      kind: "notice",
      tone: "warn",
      text: "BE 에이전트가 T-02(추천 API)에서 영훈님의 결정을 기다리고 있습니다. 4시간 무응답 시 다시 알려드리겠습니다.",
    },
  },

  // ---------- Room 1 (FE + FE 에이전트 + PM) ----------
  {
    id: "m_r1_01",
    roomId: IDS.room1,
    authorType: "system",
    ts: t("12:40"),
    card: {
      kind: "notice",
      tone: "info",
      text: "전병국 님이 FE로 참여했습니다. Room 1이 생성되고 FE 에이전트가 활성화됐습니다.",
    },
  },
  {
    id: "m_r1_02",
    roomId: IDS.room1,
    authorType: "pm",
    ts: t("12:41"),
    text: "FE 레포를 연결해주세요. 브릿지는 이 경로 안에서만 에이전트를 실행합니다.",
    card: {
      kind: "repo",
      role: "FE",
      status: "connected",
      url: "https://github.com/Capstone-NOMOS/jazzify-web",
      localPath: "~/dev/jazzify-web",
    },
  },
  {
    id: "m_r1_03",
    roomId: IDS.room1,
    authorType: "pm",
    ts: t("13:12"),
    text: "대표 승인이 완료되어 FE 태스크 2개를 전달합니다. 명세와 API 계약을 함께 첨부했습니다 — BE 에이전트도 같은 계약 텍스트를 받았습니다.",
    card: { kind: "dispatch", taskIds: ["T-03", "T-04"], specRef: "SPEC v1", contractRef: "CONTRACT v1" },
  },
  {
    id: "m_r1_04",
    roomId: IDS.room1,
    authorType: "agent",
    authorId: IDS.feAgent,
    ts: t("13:13"),
    text: "T-03 ♥ 버튼부터 시작합니다. 계약의 POST /api/v1/favorites 응답 형식에 맞춰 낙관적 업데이트로 구현하겠습니다.",
    card: {
      kind: "log",
      agentId: IDS.feAgent,
      taskId: "T-03",
      live: true,
      lines: [
        { kind: "mcp", text: "get_spec(F-01) → AC 3개 수신" },
        { kind: "mcp", text: "get_contract(F-01) → POST /api/v1/favorites" },
        { kind: "tool", text: "Read src/components/song/SongDetail.tsx" },
        { kind: "edit", text: "Write src/components/song/FavoriteButton.tsx (+84)" },
        { kind: "edit", text: "Edit src/components/song/SongDetail.tsx (+6 −1)" },
        { kind: "test", text: "vitest run FavoriteButton — 3 passed" },
        { kind: "info", text: "AC2(채워진 하트) 스타일 다듬는 중…" },
      ],
    },
  },
  {
    id: "m_r1_05",
    roomId: IDS.room1,
    authorType: "user",
    authorId: IDS.fe,
    ts: t("13:40"),
    text: "@FE 에이전트 BE 레포의 auth.py에서 토큰 만료 시간도 같이 고쳐줘",
  },
  {
    id: "m_r1_06",
    roomId: IDS.room1,
    authorType: "system",
    ts: t("13:40"),
    card: {
      kind: "policy",
      actionKey: "scope:violation",
      decider: "FORBIDDEN",
      path: "~/dev/jazzify-api/app/auth.py",
      reason:
        "이 경로는 BE 소유입니다. FE 에이전트의 스코프는 ~/dev/jazzify-web/** 입니다. 이벤트 로그에 기록됐습니다.",
    },
  },
  {
    id: "m_r1_07",
    roomId: IDS.room1,
    authorType: "agent",
    authorId: IDS.feAgent,
    ts: t("13:40"),
    text: "BE 레포는 제 작업 범위 밖이라 수정할 수 없습니다. 토큰 만료 시간 변경이 필요하면 PM을 통해 BE 태스크로 요청해주세요. T-03 계속 진행합니다.",
  },

  // ---------- Room 2 (BE + BE 에이전트 + PM) ----------
  {
    id: "m_r2_01",
    roomId: IDS.room2,
    authorType: "system",
    ts: t("12:45"),
    card: {
      kind: "notice",
      tone: "info",
      text: "오영훈 님이 BE로 참여했습니다. Room 2가 생성되고 BE 에이전트가 활성화됐습니다.",
    },
  },
  {
    id: "m_r2_02",
    roomId: IDS.room2,
    authorType: "pm",
    ts: t("12:46"),
    text: "BE 레포를 연결해주세요.",
    card: {
      kind: "repo",
      role: "BE",
      status: "connected",
      url: "https://github.com/Capstone-NOMOS/jazzify-api",
      localPath: "~/dev/jazzify-api",
    },
  },
  {
    id: "m_r2_03",
    roomId: IDS.room2,
    authorType: "pm",
    ts: t("13:12"),
    text: "대표 승인이 완료되어 BE 태스크 2개를 전달합니다. FE 에이전트도 같은 계약 텍스트를 받았습니다.",
    card: { kind: "dispatch", taskIds: ["T-01", "T-02"], specRef: "SPEC v1", contractRef: "CONTRACT v1" },
  },
  {
    id: "m_r2_04",
    roomId: IDS.room2,
    authorType: "agent",
    authorId: IDS.beAgent,
    ts: t("13:13"),
    text: "T-01 즐겨찾기 API를 먼저 구현합니다. 헌법의 `/api/v1/*` 규칙과 camelCase 응답을 따르겠습니다.",
    card: {
      kind: "log",
      agentId: IDS.beAgent,
      taskId: "T-01",
      live: false,
      lines: [
        { kind: "mcp", text: "get_constitution() → 스택·컨벤션 수신" },
        { kind: "mcp", text: "search_decisions('favorites storage') → 0건" },
        { kind: "mcp", text: "ask_human → ADR-001 저장 (PostgreSQL 단일 테이블)" },
        { kind: "edit", text: "Write app/models/favorite.py (+31)" },
        { kind: "edit", text: "Write app/routers/favorites.py (+72)" },
        { kind: "edit", text: "Write tests/test_favorites.py (+58)" },
        { kind: "test", text: "pytest tests/test_favorites.py — 5 passed" },
        { kind: "mcp", text: "submit_task(T-01, commit a3f9c1e)" },
      ],
    },
  },
  {
    id: "m_r2_05",
    roomId: IDS.room2,
    authorType: "system",
    ts: t("13:45"),
    card: {
      kind: "verification",
      taskId: "T-01",
      commit: "a3f9c1e",
      checks: { scope: true, tests: true, commit: true },
      passed: true,
      testSummary: "pytest 5 passed · 스코프 위반 0건 · 커밋 존재 확인",
    },
  },
  {
    id: "m_r2_06",
    roomId: IDS.room2,
    authorType: "agent",
    authorId: IDS.beAgent,
    ts: t("14:01"),
    text: "T-02 추천 API를 시작했는데, 명세에 없는 결정이 있습니다. ADR을 먼저 검색했지만 관련 기록이 없어 영훈님께 여쭙니다.",
  },
  {
    id: "m_r2_07",
    roomId: IDS.room2,
    authorType: "agent",
    authorId: IDS.beAgent,
    ts: t("14:02"),
    card: {
      kind: "question",
      taskId: "T-02",
      question: "추천 알고리즘을 정해야 합니다. 어느 쪽으로 갈까요?",
      options: ["(a) 장르 태그 기반 단순 매칭", "(b) 협업 필터링 — 데이터가 더 필요"],
      context:
        "현재 사용자 데이터가 없어서 (b)는 콜드스타트 문제가 있습니다. (a)는 songs.genre_tags 컬럼만으로 바로 구현 가능합니다.",
      askedAt: t("14:02"),
    },
  },
];

const tasks: Task[] = [
  {
    id: "T-01",
    projectId: IDS.project,
    featureId: "F-01",
    title: "즐겨찾기 API",
    role: "BE",
    state: "DONE",
    specRef: "SPEC v1",
    contractRef: "CONTRACT v1",
    createdAt: t("13:12"),
    updatedAt: t("13:45"),
    commit: "a3f9c1e",
    costKrw: 1240,
  },
  {
    id: "T-02",
    projectId: IDS.project,
    featureId: "F-02",
    title: "추천 API",
    role: "BE",
    state: "WAITING_HUMAN",
    specRef: "SPEC v1",
    contractRef: "CONTRACT v1",
    createdAt: t("13:12"),
    updatedAt: t("14:02"),
    costKrw: 610,
  },
  {
    id: "T-03",
    projectId: IDS.project,
    featureId: "F-01",
    title: "♥ 버튼",
    role: "FE",
    state: "IN_PROGRESS",
    specRef: "SPEC v1",
    contractRef: "CONTRACT v1",
    createdAt: t("13:12"),
    updatedAt: t("13:13"),
    costKrw: 980,
  },
  {
    id: "T-04",
    projectId: IDS.project,
    featureId: "F-02",
    title: "추천 탭",
    role: "FE",
    state: "READY",
    specRef: "SPEC v1",
    contractRef: "CONTRACT v1",
    createdAt: t("13:12"),
    updatedAt: t("13:12"),
    costKrw: 0,
  },
];

const documents: Document[] = [
  {
    id: "d_const_1",
    projectId: IDS.project,
    type: "CONSTITUTION",
    version: 1,
    title: "헌법",
    content: CONSTITUTION,
    locked: true,
    createdBy: IDS.owner,
    createdAt: t("12:30"),
  },
  {
    id: "d_spec_1",
    projectId: IDS.project,
    type: "SPEC",
    version: 1,
    title: "즐겨찾기 · 유사곡 추천",
    content: SPEC_V1,
    locked: true,
    createdBy: "pm",
    createdAt: t("13:12"),
  },
  {
    id: "d_contract_1",
    projectId: IDS.project,
    type: "CONTRACT",
    version: 1,
    title: "즐겨찾기 · 추천 API",
    content: CONTRACT_V1,
    locked: true,
    createdBy: "pm",
    createdAt: t("13:12"),
  },
  {
    id: "d_adr_1",
    projectId: IDS.project,
    type: "ADR",
    version: 2,
    title: "결정기록",
    content: ADR_DOC,
    locked: false,
    createdBy: "system",
    createdAt: t("13:20"),
  },
];

const events: Event[] = [
  {
    id: "e01",
    projectId: IDS.project,
    type: "project.created",
    actor: "최영현",
    summary: "프로젝트 Jazzify 생성 (L2, 예산 2.0M 토큰)",
    ts: t("12:30"),
  },
  {
    id: "e02",
    projectId: IDS.project,
    type: "member.joined",
    actor: "전병국",
    summary: "FE로 참여 · Room 1 생성",
    ts: t("12:40"),
  },
  {
    id: "e03",
    projectId: IDS.project,
    type: "agent.online",
    actor: "병국의 Claude Code",
    summary: "FE 에이전트 연결됨",
    ts: t("12:40"),
  },
  {
    id: "e04",
    projectId: IDS.project,
    type: "member.joined",
    actor: "오영훈",
    summary: "BE로 참여 · Room 2 생성",
    ts: t("12:45"),
  },
  {
    id: "e05",
    projectId: IDS.project,
    type: "agent.online",
    actor: "영훈의 Claude Code",
    summary: "BE 에이전트 연결됨",
    ts: t("12:45"),
  },
  {
    id: "e06",
    projectId: IDS.project,
    type: "llm.call",
    actor: "PM",
    summary: "명세 초안 작성 (Sonnet) · 18.2k 토큰",
    ts: t("13:03"),
    tokens: 18200,
    costKrw: 410,
  },
  {
    id: "e07",
    projectId: IDS.project,
    type: "approval.granted",
    actor: "최영현",
    summary: "명세 v1 승인 → LOCKED",
    ts: t("13:12"),
    tone: "success",
  },
  {
    id: "e08",
    projectId: IDS.project,
    type: "task.assigned",
    actor: "PM",
    summary: "T-01·T-02 → BE, T-03·T-04 → FE 동시 분배",
    ts: t("13:12"),
  },
  {
    id: "e09",
    projectId: IDS.project,
    type: "task.started",
    actor: "영훈의 Claude Code",
    summary: "T-01 시작",
    ts: t("13:13"),
  },
  {
    id: "e10",
    projectId: IDS.project,
    type: "task.started",
    actor: "병국의 Claude Code",
    summary: "T-03 시작",
    ts: t("13:13"),
  },
  {
    id: "e11",
    projectId: IDS.project,
    type: "llm.call",
    actor: "영훈의 Claude Code",
    summary: "T-01 · 41.5k 토큰",
    ts: t("13:44"),
    tokens: 41500,
    costKrw: 1240,
  },
  {
    id: "e12",
    projectId: IDS.project,
    type: "scope.violation",
    actor: "병국의 Claude Code",
    summary: "~/dev/jazzify-api/app/auth.py 수정 시도 → 거부",
    ts: t("13:40"),
    tone: "danger",
  },
  {
    id: "e13",
    projectId: IDS.project,
    type: "task.verified",
    actor: "서버",
    summary: "T-01 검증 통과 (스코프·테스트·커밋)",
    ts: t("13:45"),
    tone: "success",
  },
  {
    id: "e14",
    projectId: IDS.project,
    type: "task.done",
    actor: "서버",
    summary: "T-01 DONE",
    ts: t("13:45"),
    tone: "success",
  },
  {
    id: "e15",
    projectId: IDS.project,
    type: "llm.call",
    actor: "병국의 Claude Code",
    summary: "T-03 · 32.8k 토큰 (진행 중)",
    ts: t("13:58"),
    tokens: 32800,
    costKrw: 980,
  },
  {
    id: "e15b",
    projectId: IDS.project,
    type: "llm.call",
    actor: "영훈의 Claude Code",
    summary: "T-02 · 20.3k 토큰 (질의 전)",
    ts: t("14:01"),
    tokens: 20300,
    costKrw: 610,
  },
  {
    id: "e16",
    projectId: IDS.project,
    type: "task.waiting_human",
    actor: "영훈의 Claude Code",
    summary: "T-02 → 영훈에게 질의 (추천 알고리즘)",
    ts: t("14:02"),
    tone: "warn",
  },
  {
    id: "e17",
    projectId: IDS.project,
    type: "llm.call",
    actor: "PM",
    summary: "라우팅·요약 (Haiku) · 6.1k 토큰",
    ts: t("14:02"),
    tokens: 6100,
    costKrw: 90,
  },
];

export const SEED: AppState = {
  version: 3,
  users: [
    { id: IDS.owner, username: "caleb", nickname: "최영현", pubkey: "nomos_pk_7Qx1…c9aE", createdAt: t("12:00") },
    { id: IDS.fe, username: "byoungguk", nickname: "전병국", pubkey: "nomos_pk_Ma4k…p2Lf", createdAt: t("12:05") },
    { id: IDS.be, username: "yeonghun", nickname: "오영훈", pubkey: "nomos_pk_Zt8w…h6Rn", createdAt: t("12:06") },
  ],
  agents: [
    {
      id: IDS.feAgent,
      userId: IDS.fe,
      harness: "claude-code",
      label: "병국의 Claude Code",
      status: "working",
      lastSeen: t("14:10"),
      connected: true,
    },
    {
      id: IDS.beAgent,
      userId: IDS.be,
      harness: "claude-code",
      label: "영훈의 Claude Code",
      status: "online",
      lastSeen: t("14:09"),
      connected: true,
    },
  ],
  projects: [
    {
      id: IDS.project,
      name: "Jazzify",
      description: "재즈 음원 추천 웹앱",
      level: "L2",
      stack: "Next.js + FastAPI",
      ownerId: IDS.owner,
      pmBudgetTokens: 2_000_000,
      pmSpentTokens: 780_000,
      createdAt: t("12:30"),
      inviteTokens: { FE: "Jz7kFE", BE: "Jz7kBE" },
    },
  ],
  members: [
    { projectId: IDS.project, userId: IDS.owner, role: "OWNER", joinedAt: t("12:30") },
    { projectId: IDS.project, userId: IDS.fe, role: "FE", joinedAt: t("12:40") },
    { projectId: IDS.project, userId: IDS.be, role: "BE", joinedAt: t("12:45") },
  ],
  repos: [
    {
      id: "repo_fe",
      projectId: IDS.project,
      ownerRole: "FE",
      url: "https://github.com/Capstone-NOMOS/jazzify-web",
      localPath: "~/dev/jazzify-web",
      scopePattern: "**",
    },
    {
      id: "repo_be",
      projectId: IDS.project,
      ownerRole: "BE",
      url: "https://github.com/Capstone-NOMOS/jazzify-api",
      localPath: "~/dev/jazzify-api",
      scopePattern: "**",
    },
  ],
  rooms: [
    { id: IDS.room3, projectId: IDS.project, type: "OWNER" },
    { id: IDS.room1, projectId: IDS.project, type: "FE" },
    { id: IDS.room2, projectId: IDS.project, type: "BE" },
  ],
  messages,
  tasks,
  documents,
  events,
  session: null,
  pmTyping: {},
};
