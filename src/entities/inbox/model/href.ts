import type { Schemas } from "@/shared/api";

/** 처리할 일을 누르면 갈 곳. 승인·질문은 받은 편지함의 카드(id 앵커)로 */
export function inboxItemHref(i: Schemas["InboxItem"]): string {
  const p = `/p/${i.projectId}`;
  switch (i.kind) {
    case "approval_role_review":
    case "approval_final":
    case "release":
      return `${p}/inbox#${i.approvalId}`;
    case "question":
      return `${p}/inbox#${i.questionId}`;
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

/** 알림을 누르면 갈 곳. 답이 정해진 질문은 결정기록에 있다 */
export function notificationHref(n: Schemas["Notification"]): string {
  const p = `/p/${n.projectId}`;
  if (n.type === "task_done" && n.taskId) return `${p}/tasks/${n.taskId}`;
  if (n.type === "question_asked" && n.questionId) return `${p}/inbox#${n.questionId}`;
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
