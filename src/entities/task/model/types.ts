export type TaskState =
  "READY" | "QUEUED" | "IN_PROGRESS" | "WAITING_HUMAN" | "SUBMITTED" | "VERIFYING" | "DONE" | "FAILED" | "ESCALATED";

export interface Task {
  id: string;
  projectId: string;
  featureId: string;
  title: string;
  role: "FE" | "BE";
  state: TaskState;
  specRef: string;
  contractRef?: string;
  createdAt: string;
  updatedAt: string;
  commit?: string;
  costKrw: number;
}
