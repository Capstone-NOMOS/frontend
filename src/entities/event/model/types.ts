export interface Event {
  id: string;
  projectId: string;
  type: string;
  actor: string;
  summary: string;
  ts: string;
  costKrw?: number;
  tokens?: number;
  tone?: "default" | "warn" | "danger" | "success";
}
