// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 GET /projects/{projectId}/notes는 unknown이다

export type NoteKind = "IMPLEMENTED" | "DECIDED" | "GOTCHA" | "DEVIATION";

/** 인계 노트. 에이전트의 자기 보고이며 검증 통과 여부는 verifications가 정본이다 */
export interface ApiNote {
  id: string;
  projectId: string;
  /** 프로젝트별 1부터 증가 */
  seq: number;
  taskId: string | null;
  specId: string | null;
  repoId: string | null;
  kind: NoteKind;
  headline: string;
  keyPoints: string[];
  affects: string[];
  authorAgentId: string;
  onBehalfOf: string;
  /** 정정 대상 노트 id. 원본은 지워지지 않는다 */
  supersedes: string | null;
  createdAt: string;
}

export const NOTE_KIND: Record<NoteKind, { label: string; tone: "success" | "brand" | "warn" | "danger" }> = {
  IMPLEMENTED: { label: "구현 완료", tone: "success" },
  DECIDED: { label: "결정 사항", tone: "brand" },
  GOTCHA: { label: "주의 사항", tone: "warn" },
  DEVIATION: { label: "명세 이탈", tone: "danger" },
};

/** 새로 받은 노트를 앞에 합친다. seq 중복은 새 것을 남기고, seq 내림차순을 유지한다 */
export function mergeNotes(incoming: ApiNote[], prev: ApiNote[]) {
  const bySeq = new Map<number, ApiNote>();
  for (const n of [...prev, ...incoming]) bySeq.set(n.seq, n);
  return [...bySeq.values()].sort((a, b) => b.seq - a.seq);
}
