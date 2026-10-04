import { Badge } from "@/shared/ui";
import type { GateMode, VerificationResult } from "../model/api";

// success·info·warn·danger tone이 decider 토큰(auto·review·human·forbidden)을 감싼다 (docs/design.md)
const GATE_MODE: Record<GateMode, { label: string; tone: "success" | "info" | "warn" | "danger" }> = {
  AUTO: { label: "AUTO", tone: "success" },
  PM_REVIEW: { label: "PM 검토", tone: "info" },
  HUMAN: { label: "사람", tone: "warn" },
  FORBIDDEN: { label: "금지", tone: "danger" },
};

export function GateModeBadge({ mode }: { mode: GateMode }) {
  const m = GATE_MODE[mode];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const RESULT: Record<VerificationResult, { label: string; tone: "success" | "danger" | "neutral" }> = {
  PASS: { label: "PASS", tone: "success" },
  FAIL: { label: "FAIL", tone: "danger" },
  SKIPPED: { label: "SKIPPED", tone: "neutral" },
};

export function VerificationBadge({ result }: { result: VerificationResult }) {
  const m = RESULT[result];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
