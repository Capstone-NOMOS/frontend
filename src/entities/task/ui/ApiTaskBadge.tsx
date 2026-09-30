import { Badge } from "@/shared/ui";
import type { ApiTaskState } from "../model/api";

export const API_TASK_META: Record<
  ApiTaskState,
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" | "brand" }
> = {
  READY: { label: "READY", tone: "neutral" },
  CLAIMED: { label: "CLAIMED", tone: "neutral" },
  IN_PROGRESS: { label: "IN PROGRESS", tone: "info" },
  VERIFYING: { label: "VERIFYING", tone: "brand" },
  AWAITING_APPROVAL: { label: "AWAITING APPROVAL", tone: "warn" },
  BLOCKED: { label: "BLOCKED", tone: "warn" },
  ESCALATED: { label: "ESCALATED", tone: "danger" },
  DONE: { label: "DONE", tone: "success" },
};

export function ApiTaskBadge({ state }: { state: ApiTaskState }) {
  const m = API_TASK_META[state];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
