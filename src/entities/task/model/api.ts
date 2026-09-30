import type { TeamRole } from "@/shared/model";

// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 GET /projects/{projectId}/tasks는 unknown이다

/** 서버 태스크 상태 8종. 목업의 TaskState와 다르다 (entities/task/model/types.ts는 목업 화면 전용) */
export type ApiTaskState =
  "READY" | "CLAIMED" | "IN_PROGRESS" | "VERIFYING" | "AWAITING_APPROVAL" | "BLOCKED" | "ESCALATED" | "DONE";

export interface ApiTask {
  id: string;
  projectId: string;
  repoId: string;
  specId: string | null;
  kind: string;
  title: string;
  state: ApiTaskState;
  teamRole: TeamRole | null;
  assigneeAgentId: string | null;
  branchName: string | null;
  blockedReason: string | null;
  retryCount: number;
}

export interface TaskFilters {
  state?: ApiTaskState;
  teamRole?: TeamRole;
}
