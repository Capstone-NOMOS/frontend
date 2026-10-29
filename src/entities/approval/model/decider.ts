import type { Schemas } from "@/shared/api";

type Approval = Schemas["Approval"];

/**
 * 결정할 수 있는 사람. 1차 검토(role_review)는 검토자 본인과 대표, 최종(final)은 대표만.
 * 최종 판정은 서버(403 NOT_APPROVAL_REVIEWER) — 여기서는 버튼을 보일지만 정한다
 */
export function canDecideApproval(a: Approval, userId: string, isRep: boolean) {
  if (isRep) return true;
  return a.stage === "role_review" && a.reviewer?.userId === userId;
}
