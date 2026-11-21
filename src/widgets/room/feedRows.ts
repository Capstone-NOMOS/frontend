import type { Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";

type RoomMessage = Schemas["RoomMessage"];
type Question = Schemas["AgentQuestion"];

/**
 * 이 역할 룸에 보일 줄인가. 질문은 묻는 쪽·답하는 쪽 룸에만(PM→PM 질문은 대표 룸에만), 태스크 줄은 그 태스크 역할 룸에만.
 * 아직 못 읽은 질문·태스크의 줄은 판단할 수 없어 남긴다
 */
export function belongsTo(role: TeamRole, questions: Question[], tasks: Schemas["Task"][]) {
  const qs = new Map(questions.map((q) => [q.id, q]));
  const taskRoles = new Map(tasks.map((t) => [t.id, t.teamRole]));
  return (m: RoomMessage) => {
    const q = m.questionId ? qs.get(m.questionId) : undefined;
    if (q) return q.askerRole === role || q.targetRole === role;
    const r = m.taskId ? taskRoles.get(m.taskId) : undefined;
    return !r || r === role;
  };
}

export type Row = { message: RoomMessage; question?: Question; folded: RoomMessage[] };

/** 같은 questionId 줄은 처음 줄 자리의 카드 하나로 묶는다. 질문 내용을 아직 못 읽었으면 그냥 줄로 둔다 */
export function toRows(messages: RoomMessage[], questions: Question[]): Row[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const cards = new Map<string, Row>();
  const rows: Row[] = [];
  for (const m of messages) {
    const q = m.questionId ? byId.get(m.questionId) : undefined;
    const card = q && cards.get(q.id);
    if (card) {
      card.folded.push(m);
      continue;
    }
    const row: Row = { message: m, question: q, folded: [] };
    if (q) cards.set(q.id, row);
    rows.push(row);
  }
  return rows;
}
