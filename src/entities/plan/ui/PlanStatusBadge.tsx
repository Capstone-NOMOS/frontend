import type { Schemas } from "@/shared/api";
import { Badge } from "@/shared/ui";
import { PLAN_STATUS } from "../model/plan";

export function PlanStatusBadge({ status }: { status: Schemas["PmPlan"]["status"] }) {
  const m = PLAN_STATUS[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
