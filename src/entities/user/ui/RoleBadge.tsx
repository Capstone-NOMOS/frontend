import { Badge } from "@/shared/ui";
import type { Role } from "@/shared/model";

export const ROLE_TONE: Record<Role, "pm" | "fe" | "be"> = { OWNER: "pm", FE: "fe", BE: "be" };
export const ROLE_LABEL: Record<Role, string> = { OWNER: "대표", FE: "FE", BE: "BE" };

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>;
}
