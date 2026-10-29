import type { Schemas } from "@/shared/api";

// entities/room의 ROLE_ROOM과 같은 주소 조각 (entities끼리 import하지 않는다). PM에게 물은 질문은 대표 룸에서 답한다
const QUESTION_ROOM: Record<string, string> = { FRONTEND: "frontend", BACKEND: "backend", PM: "owner" };

/** 역할 태스크의 승인 카드는 그 역할 룸에, G3·역할 없는 승인은 대표 룸에 뜬다 */
function approvalHref(i: Schemas["InboxItem"]) {
  const slug = i.kind !== "release" && i.role ? QUESTION_ROOM[i.role] : undefined;
  return `/p/${i.projectId}/rooms/${slug ?? "owner"}#${i.approvalId}`;
}

/** 답할 역할의 룸에 있는 질문 카드. 역할을 모르면 받은 편지함의 질문 칸으로 */
function questionHref(projectId: string, questionId: string | null, targetRole: string | null) {
  const slug = targetRole ? QUESTION_ROOM[targetRole] : undefined;
  const hash = questionId ? `#${questionId}` : "";
  return slug ? `/p/${projectId}/rooms/${slug}${hash}` : `/p/${projectId}/inbox${hash}`;
}

/** 처리할 일을 누르면 갈 곳. 승인·질문은 그 카드가 뜬 룸(id 앵커)으로 */
export function inboxItemHref(i: Schemas["InboxItem"]): string {
  const p = `/p/${i.projectId}`;
  switch (i.kind) {
    case "approval_role_review":
    case "approval_final":
    case "release":
      // 승인 항목의 role은 태스크 역할(payload.teamRole)이다
      return approvalHref(i);
    case "question":
      // 처리할 일의 role은 답할 역할(targetRole)이다
      return questionHref(i.projectId, i.questionId, i.role);
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

/** 알림을 누르면 갈 곳. 물은 질문은 답할 역할의 룸으로(role = targetRole), 답이 정해진 질문은 결정기록으로 */
export function notificationHref(n: Schemas["Notification"]): string {
  const p = `/p/${n.projectId}`;
  if (n.type === "task_done" && n.taskId) return `${p}/tasks/${n.taskId}`;
  if (n.type === "question_asked") return questionHref(n.projectId, n.questionId, n.role);
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
