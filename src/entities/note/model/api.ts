import type { Schemas } from "@/shared/api";

/** 인계 노트. 에이전트의 자기 보고이며 검증 통과 여부는 verifications가 정본이다 */
type Note = Schemas["Note"];

export type NoteKind = Note["kind"];

export const NOTE_KIND: Record<NoteKind, { label: string; tone: "success" | "brand" | "warn" | "danger" }> = {
  IMPLEMENTED: { label: "구현 완료", tone: "success" },
  DECIDED: { label: "결정 사항", tone: "brand" },
  GOTCHA: { label: "주의 사항", tone: "warn" },
  DEVIATION: { label: "명세 이탈", tone: "danger" },
};

/** 새로 받은 노트를 앞에 합친다. seq 중복은 새 것을 남기고, seq 내림차순을 유지한다 */
export function mergeNotes(incoming: Note[], prev: Note[]) {
  const bySeq = new Map<number, Note>();
  for (const n of [...prev, ...incoming]) bySeq.set(n.seq, n);
  return [...bySeq.values()].sort((a, b) => b.seq - a.seq);
}
