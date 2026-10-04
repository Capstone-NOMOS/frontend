import type { Schemas } from "@/shared/api";

type PmPlan = Schemas["PmPlan"];
type Tone = "neutral" | "brand" | "success" | "warn" | "danger" | "info";

/** 명세 §0-5: confirm은 승인 / 수정 요청, 수정은 최대 3회 (BE는 강제하지 않는다 — 화면에서 막는다) */
export const MAX_REVISIONS = 3;

export const PLAN_STATUS: Record<PmPlan["status"], { label: string; tone: Tone }> = {
  pending: { label: "작성 중", tone: "info" },
  ready: { label: "승인 대기", tone: "brand" },
  failed: { label: "실패", tone: "danger" },
  applied: { label: "승인됨", tone: "success" },
  rejected: { label: "반려됨", tone: "neutral" },
};

export const PLAN_MODE: Record<NonNullable<PmPlan["draft"]>["mode"], string> = {
  SEQUENTIAL: "순차 진행",
  CONTRACT_PARALLEL: "계약 후 병렬",
  HYBRID: "혼합",
};

export const PLAN_FAILURE: Record<NonNullable<PmPlan["error"]>["reason"], string> = {
  refused: "PM이 이 지시를 처리하지 않았습니다.",
  truncated: "계획이 너무 길어 잘렸습니다. 범위를 나눠 요청해 주세요.",
  timeout: "시간 안에 끝나지 않았습니다. 대표 노트북의 PM 작업기가 켜져 있는지 확인해 주세요.",
  invalid: "초안이 명세·태스크 검증을 통과하지 못했습니다.",
  restart: "서버가 재시작되어 작성이 중단됐습니다.",
  budget: "PM 예산을 넘어 작성이 중단됐습니다.",
  api_error: "PM 호출 중 오류가 났습니다.",
};

/** 수정 요청으로 이어진 몇 번째 초안인가 (원래 지시 = 0) */
export function revisionDepth(plan: PmPlan, plans: PmPlan[]) {
  const byId = new Map(plans.map((p) => [p.id, p]));
  let depth = 0;
  let cur = plan.parentPlanId ? byId.get(plan.parentPlanId) : undefined;
  while (cur) {
    depth++;
    cur = cur.parentPlanId ? byId.get(cur.parentPlanId) : undefined;
  }
  return depth;
}

/** 수정 요청을 받아 새 초안이 나온 계획. 체인의 최신 초안만 승인·수정·반려할 수 있게 화면에서 접는다 */
export function isSuperseded(plan: PmPlan, plans: PmPlan[]) {
  return plans.some((p) => p.parentPlanId === plan.id);
}

/** 대화 순서(오래된 것부터). API는 최근 요청 순으로 준다 */
export function chronological(plans: PmPlan[]) {
  return [...plans].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 담당이 없는 태스크 ref. 적용하면 아무도 가져가지 않고 시작도 422 */
export function unassignedRefs(plan: PmPlan) {
  return plan.assignments.filter((a) => a.agent === null).map((a) => a.ref);
}

/** 대시보드 등에 쓰는 금액 표시. PM 상태의 budgetUsd·spentUsd는 number다 */
export function fmtUsdNumber(n: number) {
  return `$${n.toFixed(2)}`;
}
