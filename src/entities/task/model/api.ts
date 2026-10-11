import type { Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";

/** 서버 태스크 상태 8종. 목업의 TaskState와 다르다 (entities/task/model/types.ts는 목업 화면 전용) */
export type ApiTaskState = Schemas["Task"]["state"];

export interface TaskFilters {
  state?: ApiTaskState;
  teamRole?: TeamRole;
}

/**
 * BLOCKED의 이유. 둘은 풀리는 방법이 다르다 — 화면에서 구분해 보여 준다.
 * QUESTION은 사람이 답하면 자동으로 풀리고, AGENT_STOPPED는 대표가 원인을 해결한 뒤 재개해야 한다
 */
export const BLOCKED_REASON: Record<NonNullable<Schemas["Task"]["blockedReason"]>, string> = {
  QUESTION: "답을 기다리는 중",
  AGENT_STOPPED: "에이전트가 멈춤 · 대표 확인 필요",
  DISPUTE: "DISPUTE",
  DEPENDENCY: "DEPENDENCY",
};
