import type { Schemas } from "@/shared/api";

type Project = Schemas["Project"];

export const PROJECT_STATUS: Record<
  Project["status"],
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" }
> = {
  planning: { label: "준비 중", tone: "neutral" },
  active: { label: "진행 중", tone: "info" },
  halted: { label: "정지", tone: "warn" },
  completed: { label: "완료", tone: "success" },
  aborted: { label: "중단", tone: "danger" },
};
