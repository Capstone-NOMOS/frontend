import { Badge } from "@/shared/ui";

/** 소유 역할이 하나도 없는 레포는 프로젝트에 넣을 수 없다 */
export function OwnershipBadge({ assigned }: { assigned: boolean }) {
  return assigned ? <Badge tone="success">소유 역할 지정됨</Badge> : <Badge tone="warn">소유 역할 미지정</Badge>;
}
