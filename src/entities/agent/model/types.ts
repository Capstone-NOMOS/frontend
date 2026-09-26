export type AgentStatus = "online" | "working" | "offline";

export interface Agent {
  id: string;
  userId: string;
  harness: "claude-code";
  label: string;
  status: AgentStatus;
  lastSeen: string;
  connected: boolean;
}
