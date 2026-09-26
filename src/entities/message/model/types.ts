import type { Decider } from "@/shared/model";

export type SpecFeature = { id: string; title: string; acs: string[] };
export type SpecTask = { id: string; title: string; role: "FE" | "BE" };
export type SpecDecision = { text: string; owner: "PM" | "OWNER" | "FE" | "BE" };

export type Card =
  | {
      kind: "spec";
      version: number;
      title: string;
      features: SpecFeature[];
      contract: string[];
      tasks: SpecTask[];
      decisions: SpecDecision[];
      status: "pending" | "approved" | "changes_requested";
      revisions: number;
    }
  | { kind: "dispatch"; taskIds: string[]; specRef: string; contractRef: string }
  | {
      kind: "log";
      agentId: string;
      taskId: string;
      live: boolean;
      lines: { kind: "tool" | "edit" | "info" | "test" | "mcp"; text: string }[];
    }
  | {
      kind: "question";
      taskId: string;
      question: string;
      options: string[];
      context: string;
      askedAt: string;
      answer?: string;
      answeredBy?: string;
      adrId?: string;
    }
  | {
      kind: "verification";
      taskId: string;
      commit: string;
      checks: { scope: boolean; tests: boolean; commit: boolean };
      passed: boolean;
      testSummary: string;
    }
  | {
      kind: "report";
      title: string;
      done: number;
      total: number;
      duration: string;
      cost: { FE: number; BE: number; PM: number };
      decisions: string[];
      checks: string[];
      confirmItems: string[];
      status: "pending" | "approved" | "changes_requested";
    }
  | {
      kind: "policy";
      actionKey: string;
      decider: Decider;
      path: string;
      reason: string;
    }
  | {
      kind: "repo";
      role: "FE" | "BE";
      status: "pending" | "connected";
      url?: string;
      localPath?: string;
    }
  | { kind: "notice"; tone: "info" | "warn" | "success" | "danger"; text: string };

export interface Message {
  id: string;
  roomId: string;
  authorType: "user" | "agent" | "pm" | "system";
  authorId?: string;
  ts: string;
  text?: string;
  card?: Card;
}
