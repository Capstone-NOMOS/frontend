import type { OrgRole } from "@/shared/model";
import { Badge } from "@/shared/ui";

// 대표는 pm 톤 (docs/design.md — ROLE_TONE의 OWNER와 같은 색)
export function OrgRoleBadge({ role }: { role: OrgRole }) {
  return role === "REPRESENTATIVE" ? <Badge tone="pm">대표</Badge> : <Badge>팀원</Badge>;
}

/** 세 상태를 구분한다. 필드 없음 = 확인 못 함(토큰 없음·조회 실패·GitHub 미연결), false = 확인했는데 권한 없음 */
export function CollaboratorBadge({ isCollaborator }: { isCollaborator?: boolean }) {
  if (isCollaborator === undefined) return <Badge>확인 불가</Badge>;
  return isCollaborator ? <Badge tone="success">확인됨</Badge> : <Badge tone="warn">GitHub 권한 없음</Badge>;
}
