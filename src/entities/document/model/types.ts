export type DocType = "CONSTITUTION" | "SPEC" | "CONTRACT" | "ADR";

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
