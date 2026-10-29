import type { Schemas } from "@/shared/api";

// entities/room의 ROLE_ROOM과 같은 주소 조각 (entities끼리 import하지 않는다)
const ROOM_SLUG: Record<string, string> = { FRONTEND: "frontend", BACKEND: "backend" };

/**
 * 질문 카드가 있는 룸. 답하는 역할의 룸에 나오고, PM 질문은 묻는 쪽 룸에서 대표가 답한다.
 * 묻는 역할을 모르면(목록에 아직 없음) 프로젝트 대시보드로
 */
function questionRoomHref(projectId: string, questionId: string | null, targetRole: string | null, askerRole?: string) {
  const role = targetRole === "PM" ? askerRole : targetRole;
  const slug = role && ROOM_SLUG[role];
  return slug ? `/p/${projectId}/rooms/${slug}${questionId ? `#${questionId}` : ""}` : `/p/${projectId}`;
}

/**
 * 처리할 일을 누르면 갈 곳. 승인은 받은 편지함의 카드(id 앵커), 질문은 그 룸의 카드로.
 * askerRoleOf: 질문 id → 묻는 역할 (/me/questions에서). PM 질문의 룸을 고를 때만 쓴다
 */
export function inboxItemHref(
  i: Schemas["InboxItem"],
  askerRoleOf: (questionId: string) => string | undefined,
): string {
  const p = `/p/${i.projectId}`;
  switch (i.kind) {
    case "approval_role_review":
    case "approval_final":
    case "release":
      return `${p}/inbox#${i.approvalId}`;
    case "question":
      // 처리할 일의 role은 답할 역할(targetRole)이다
      return questionRoomHref(i.projectId, i.questionId, i.role, i.questionId ? askerRoleOf(i.questionId) : undefined);
    case "contract":
      return `${p}/docs/contract`;
    case "plan":
      return `${p}/rooms/owner`;
    case "stuck_task":
      return `${p}/tasks/${i.taskId}`;
    case "agent_needed":
      return "/connect";
  }
}

/** 알림을 누르면 갈 곳. 물은 질문은 그 룸의 카드로(role은 답할 역할), 답이 정해진 질문은 결정기록으로 */
export function notificationHref(
  n: Schemas["Notification"],
  askerRoleOf: (questionId: string) => string | undefined,
): string {
  const p = `/p/${n.projectId}`;
  if (n.type === "task_done" && n.taskId) return `${p}/tasks/${n.taskId}`;
  if (n.type === "question_asked")
    return questionRoomHref(n.projectId, n.questionId, n.role, n.questionId ? askerRoleOf(n.questionId) : undefined);
  if (n.type === "question_answered") return `${p}/docs/adr`;
  return `${p}/inbox`;
}

export const INBOX_KIND_LABEL: Record<Schemas["InboxItem"]["kind"], string> = {
  approval_role_review: "담당 검토",
  approval_final: "최종 승인",
  release: "완료 확인",
  question: "질문",
  contract: "API 계약",
  plan: "계획",
  stuck_task: "멈춘 태스크",
  agent_needed: "에이전트 연결",
};
