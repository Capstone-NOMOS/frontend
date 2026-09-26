import { cn } from "@/shared/lib/format";
import type { AgentStatus } from "../model/types";

export const AGENT_STATUS: Record<AgentStatus, { label: string; cls: string }> = {
  online: { label: "대기", cls: "bg-auto" },
  working: { label: "작업 중", cls: "bg-review" },
  offline: { label: "오프라인", cls: "bg-forbidden" },
};

export function StatusDot({ status, pulse }: { status: AgentStatus; pulse?: boolean }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", AGENT_STATUS[status].cls, pulse && status === "working" && "pulse-dot")} />;
}
