import type { Level, Role } from "@/shared/model";

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
