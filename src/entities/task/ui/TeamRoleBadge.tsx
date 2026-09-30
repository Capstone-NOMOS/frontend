import type { TeamRole } from "@/shared/model";
import { Badge } from "@/shared/ui";

export const TEAM_ROLE_META: Record<TeamRole, { label: string; tone: "fe" | "be" }> = {
  FRONTEND: { label: "FE", tone: "fe" },
  BACKEND: { label: "BE", tone: "be" },
};

export function TeamRoleBadge({ role }: { role: TeamRole }) {
  const m = TEAM_ROLE_META[role];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
