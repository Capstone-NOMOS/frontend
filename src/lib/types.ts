export type Role = "OWNER" | "FE" | "BE";
export type Level = "L1" | "L2" | "L3" | "L4";
export type Decider = "AUTO" | "PM_REVIEW" | "HUMAN" | "FORBIDDEN";
export type AgentStatus = "online" | "working" | "offline";
export type TaskState =
  | "READY"
  | "QUEUED"
  | "IN_PROGRESS"
  | "WAITING_HUMAN"
  | "SUBMITTED"
  | "VERIFYING"
  | "DONE"
  | "FAILED"
  | "ESCALATED";
export type DocType = "CONSTITUTION" | "SPEC" | "CONTRACT" | "ADR";
export type RoomType = "OWNER" | "FE" | "BE";

export interface User {
  id: string;
  username: string;
  nickname: string;
  pubkey: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  harness: "claude-code";
  label: string;
  status: AgentStatus;
  lastSeen: string;
  connected: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  level: Level;
  stack: string;
  ownerId: string;
  pmBudgetTokens: number;
  pmSpentTokens: number;
  createdAt: string;
  inviteTokens: { FE: string; BE: string };
}

export interface Membership {
  projectId: string;
  userId: string;
  role: Role;
  joinedAt: string;
}

export interface Repo {
  id: string;
  projectId: string;
  ownerRole: "FE" | "BE";
  url: string;
  localPath: string;
  scopePattern: string;
}

export interface Room {
  id: string;
  projectId: string;
  type: RoomType;
}

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

export interface Document {
  id: string;
  projectId: string;
  type: DocType;
  version: number;
  title: string;
  content: string;
  locked: boolean;
  createdBy: string;
  createdAt: string;
}

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

export interface Session {
  userId: string;
}

export interface AppState {
  version: number;
  users: User[];
  agents: Agent[];
  projects: Project[];
  members: Membership[];
  repos: Repo[];
  rooms: Room[];
  messages: Message[];
  tasks: Task[];
  documents: Document[];
  events: Event[];
  session: Session | null;
  pmTyping: Record<string, boolean>;
}
