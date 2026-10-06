import type { Schemas } from "@/shared/api";
import { Badge } from "@/shared/ui";
import { PROJECT_STATUS } from "../model/api";

export function ProjectStatusBadge({ status }: { status: Schemas["Project"]["status"] }) {
  const m = PROJECT_STATUS[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
