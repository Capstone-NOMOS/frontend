import { Badge } from "@/shared/ui";
import type { TaskState } from "../model/types";

export const TASK_META: Record<TaskState, { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" | "brand" }> = {
  READY: { label: "READY", tone: "neutral" },
  QUEUED: { label: "QUEUED", tone: "neutral" },
  IN_PROGRESS: { label: "IN PROGRESS", tone: "info" },
  WAITING_HUMAN: { label: "WAITING", tone: "warn" },
  SUBMITTED: { label: "SUBMITTED", tone: "brand" },
  VERIFYING: { label: "VERIFYING", tone: "brand" },
  DONE: { label: "DONE", tone: "success" },
  FAILED: { label: "FAILED", tone: "danger" },
  ESCALATED: { label: "ESCALATED", tone: "danger" },
};

export function TaskBadge({ state }: { state: TaskState }) {
  const m = TASK_META[state];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
