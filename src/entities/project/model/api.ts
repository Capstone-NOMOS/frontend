import type { Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";

type Project = Schemas["Project"];

// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 GET /projects/{projectId}는 unknown이다

export interface ApiProjectRepo {
  id: string;
  orgId: string;
  fullName: string;
}

export interface ApiProjectMember {
  agentId: string;
  agentName: string;
  teamRole: TeamRole;
  /** 에이전트 주인 */
  userId: string;
}

/** GET /projects/{projectId}. project 부분은 생성 스키마를 그대로 쓴다 */
export interface ApiProjectDetail {
  project: Project;
  repos: ApiProjectRepo[];
  members: ApiProjectMember[];
}

export const PROJECT_STATUS: Record<
  Project["status"],
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" }
> = {
  planning: { label: "준비 중", tone: "neutral" },
  active: { label: "진행 중", tone: "info" },
  halted: { label: "정지", tone: "warn" },
  completed: { label: "완료", tone: "success" },
  aborted: { label: "중단", tone: "danger" },
};

/** pmBudgetUsd·budgetUsd는 numeric 문자열("40.00")이다. 숫자로 바꾸지 않고 표시만 한다 */
export function fmtUsd(value: string) {
  return `$${value}`;
}
