import type { Schemas } from "@/shared/api";

type ProjectEvent = Schemas["ProjectEvent"];
export type EventTone = "default" | "success" | "warn" | "danger";

/** payload에는 id만 있다. 이름은 화면이 가진 목록(태스크·에이전트·멤버)에서 찾는다 */
export interface EventLookup {
  task: (id: string) => string | undefined;
  agent: (id: string) => string | undefined;
  person: (userId: string) => string | undefined;
}

/** 화면이 이미 받아 둔 목록으로 찾기 함수를 만든다. 목록이 아직 없으면 이름 대신 기본 문구가 나온다 */
export function makeEventLookup(
  tasks: { id: string; title: string }[] = [],
  agents: { agentId: string; agentName: string }[] = [],
  members: { userId: string; nickname: string | null; loginId?: string | null }[] = [],
): EventLookup {
  return {
    task: (id) => tasks.find((t) => t.id === id)?.title,
    agent: (id) => agents.find((a) => a.agentId === id)?.agentName,
    person: (id) => {
      const m = members.find((x) => x.userId === id);
      return m ? (m.nickname ?? m.loginId ?? undefined) : undefined;
    },
  };
}

const ROLE: Record<string, string> = { FRONTEND: "FE", BACKEND: "BE" };

/** 누가 했는가. 에이전트가 했으면 에이전트, 아니면 책임 주체(사람 또는 system:*) */
export function eventActor(e: ProjectEvent, l: EventLookup) {
  // 배정·해제는 actorAgentId에 배정된 에이전트가 들어 있다 — 한 사람은 대표다
  const byPerson = e.type === "MEMBER_ASSIGNED" || e.type === "MEMBER_UNASSIGNED";
  if (e.actorAgentId && !byPerson) return l.agent(e.actorAgentId) ?? "에이전트";
  if (e.onBehalfOf === "system:pm") return "PM";
  if (e.onBehalfOf.startsWith("system:")) return "시스템";
  return l.person(e.onBehalfOf) ?? "사람";
}

/** 이벤트 한 줄 요약과 색. 모르는 type은 type 이름을 그대로 보여 준다 */
export function describeEvent(e: ProjectEvent, l: EventLookup): { text: string; tone: EventTone } {
  const p = e.payload as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const num = (k: string) => (typeof p[k] === "number" ? (p[k] as number) : 0);
  const task = () => l.task(str("taskId")) ?? "태스크";
  const agent = () => l.agent(str("agentId")) ?? "에이전트";
  const role = () => ROLE[str("teamRole")] ?? str("teamRole");

  switch (e.type) {
    case "PROJECT_CREATED":
      return { text: "프로젝트 생성", tone: "default" };
    case "MEMBER_ASSIGNED":
      return { text: `${role()} 배정 · ${agent()}`, tone: "default" };
    case "MEMBER_UNASSIGNED":
      return { text: `${role()} 배정 해제 · ${agent()}`, tone: "default" };
    case "PROJECT_STARTED":
      return { text: `프로젝트 시작 · 태스크 ${num("taskCount")}개`, tone: "success" };
    case "SPEC_CREATED":
      return { text: `명세 생성 · ${str("featureKey")}`, tone: "default" };
    case "TASK_CREATED":
      return { text: `태스크 생성 · ${str("title")}`, tone: "default" };
    case "TASKS_IMPORTED": {
      const n = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]).length : 0);
      return { text: `가져오기 · 명세 ${n("specIds")}개 · 태스크 ${n("taskIds")}개`, tone: "default" };
    }
    case "TASK_CLAIMED":
      return { text: `태스크 수령 · ${task()}`, tone: "default" };
    case "ARTIFACT_SUBMITTED":
      return { text: `제출 · ${task()} (${num("attempt")}회차)`, tone: "default" };
    case "VERIFICATION_COMPLETED": {
      const outcome = str("outcome");
      if (outcome === "DONE") return { text: `검증 통과 · 완료 · ${task()}`, tone: "success" };
      if (outcome === "AWAITING_APPROVAL") return { text: `검증 통과 · 승인 대기 · ${task()}`, tone: "warn" };
      if (outcome === "ESCALATED") return { text: `검증 3회 실패 · 에스컬레이션 · ${task()}`, tone: "danger" };
      if (outcome === "RETRY") return { text: `검증 실패 · 재시도 · ${task()}`, tone: "danger" };
      if (outcome === "PENDING") return { text: `검증 진행 중 · ${task()}`, tone: "default" };
      return { text: `검증 ${outcome} · ${task()}`, tone: "default" };
    }
    case "APPROVAL_REQUESTED":
      return { text: `승인 요청 · ${task()}`, tone: "warn" };
    case "APPROVAL_RESULT":
      return str("decision") === "APPROVE"
        ? { text: `승인 · ${task()}`, tone: "success" }
        : { text: `반려 · ${task()}${str("reason") && ` — ${str("reason")}`}`, tone: "danger" };
    case "NOTE_PUBLISHED":
      return { text: `인계 노트 · ${str("title")}`, tone: "default" };
    case "NOTES_ACK_REQUIRED": {
      const n = Array.isArray(p.noteIds) ? p.noteIds.length : 0;
      return { text: `확인할 노트 ${n}개 · ${task()}`, tone: "warn" };
    }
    case "TOOL_DENIED":
      return { text: `도구 사용 거부 · ${str("actionKey")}${str("path") && ` ${str("path")}`}`, tone: "danger" };
    case "PM_REVIEW_DEGRADED":
      return { text: `PM 리뷰 없이 자동 처리 · ${str("actionKey")}`, tone: "warn" };
    case "PM_PLAN_REQUESTED":
      return { text: str("kind") === "revise" ? "PM 수정 요청" : "PM 계획 요청", tone: "default" };
    case "PM_CALL":
      return { text: `PM 호출${e.tokenCost !== null ? ` · $${e.tokenCost.toFixed(2)}` : ""}`, tone: "default" };
    case "PM_PLAN_DRAFTED":
      return { text: `PM 초안 · 명세 ${num("specCount")}개 · 태스크 ${num("taskCount")}개`, tone: "default" };
    case "PM_PLAN_FAILED":
      return { text: `PM 계획 실패 (${str("reason")})`, tone: "danger" };
    case "PLAN_APPLIED": {
      const n = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]).length : 0);
      return { text: `계획 승인 · 명세 ${n("specIds")}개 · 태스크 ${n("taskIds")}개`, tone: "success" };
    }
    case "PLAN_REJECTED":
      return { text: `계획 반려${str("reason") && ` — ${str("reason")}`}`, tone: "default" };
    default:
      return { text: e.type, tone: "default" };
  }
}
