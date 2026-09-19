import type { Decider, Level } from "./types";

export interface PolicyRow {
  n: number;
  actionKey: string;
  label: string;
  detect: string;
  locked: boolean;
  deciders: Record<Level, Decider>;
}

const row = (
  n: number,
  actionKey: string,
  label: string,
  detect: string,
  d: [Decider, Decider, Decider, Decider],
  locked = false,
): PolicyRow => ({
  n,
  actionKey,
  label,
  detect,
  locked,
  deciders: { L1: d[0], L2: d[1], L3: d[2], L4: d[3] },
});

export const POLICY_TABLE: PolicyRow[] = [
  row(1, "code:own_path", "담당 레포 내 코드 작성", "diff 경로 ∈ 소유 레포", ["AUTO", "AUTO", "AUTO", "AUTO"]),
  row(2, "test:write", "테스트 작성", "diff tests/**", ["AUTO", "AUTO", "AUTO", "AUTO"]),
  row(3, "human:ask", "사람에게 질의", "MCP 호출", ["AUTO", "AUTO", "AUTO", "AUTO"], true),
  row(4, "dispute:raise", "이의 제기", "MCP 호출", ["AUTO", "AUTO", "AUTO", "AUTO"]),
  row(5, "contract:propose", "계약 역제안", "MCP 호출", ["HUMAN", "PM_REVIEW", "PM_REVIEW", "AUTO"]),
  row(6, "artifact:submit", "산출물 제출", "V1~V3 통과 후", ["HUMAN", "AUTO", "AUTO", "AUTO"]),
  row(7, "git:pr_open", "PR 열기", "브릿지가 gh CLI", ["PM_REVIEW", "AUTO", "AUTO", "AUTO"]),
  row(8, "dep:add", "외부 패키지 추가", "package.json / requirements.txt diff", ["HUMAN", "PM_REVIEW", "PM_REVIEW", "AUTO"]),
  row(9, "file:delete", "파일 삭제", "diff 삭제", ["HUMAN", "PM_REVIEW", "AUTO", "AUTO"]),
  row(10, "contract:change", "API 계약 변경", "contracts/** diff", ["HUMAN", "HUMAN", "PM_REVIEW", "PM_REVIEW"]),
  row(11, "db:migration", "DB 마이그레이션", "migrations/**, *.sql", ["HUMAN", "HUMAN", "HUMAN", "PM_REVIEW"]),
  row(12, "infra:ci", "CI · 인프라 설정", ".github/**, Dockerfile", ["HUMAN", "HUMAN", "HUMAN", "PM_REVIEW"]),
  row(13, "budget:exceed", "예산 초과", "PM·에이전트 토큰 누적", ["HUMAN", "HUMAN", "HUMAN", "HUMAN"]),
  row(14, "git:merge_main", "main 머지", "GitHub PR (각 레포)", ["HUMAN", "HUMAN", "HUMAN", "HUMAN"], true),
  row(15, "scope:violation", "타인 레포 수정", "diff 경로 ∉ 소유 레포", ["FORBIDDEN", "FORBIDDEN", "FORBIDDEN", "FORBIDDEN"], true),
  row(16, "secret:touch", "시크릿 접근", ".env*, *.pem, *secret*", ["FORBIDDEN", "FORBIDDEN", "FORBIDDEN", "FORBIDDEN"], true),
  row(17, "deploy", "배포", "도구 미존재", ["FORBIDDEN", "FORBIDDEN", "FORBIDDEN", "FORBIDDEN"], true),
];

export const LEVELS: { id: Level; title: string; blurb: string; detail: string }[] = [
  { id: "L1", title: "전부 확인", blurb: "온보딩 첫 주", detail: "제출·패키지·삭제까지 사람이 승인" },
  { id: "L2", title: "위험한 것만", blurb: "기본값", detail: "계약·DB·CI만 사람, 나머지는 PM 반려 가능" },
  { id: "L3", title: "경계만", blurb: "익숙한 팀", detail: "계약 변경은 PM 검토, DB·CI는 사람" },
  { id: "L4", title: "결과만", blurb: "신뢰하는 팀", detail: "main 머지·예산 외에는 자동" },
];

export const DECIDER_META: Record<Decider, { label: string; desc: string; cls: string }> = {
  AUTO: { label: "AUTO", desc: "서버 코드가 판정", cls: "bg-auto-bg text-auto" },
  PM_REVIEW: { label: "PM 검토", desc: "PM은 반려만 가능", cls: "bg-review-bg text-review" },
  HUMAN: { label: "사람", desc: "담당자 승인 카드", cls: "bg-human-bg text-human" },
  FORBIDDEN: { label: "금지", desc: "시도 자체를 거부", cls: "bg-forbidden-bg text-forbidden" },
};
