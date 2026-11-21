import { describe, expect, it } from "vitest";
import type { Schemas } from "@/shared/api";
import { belongsTo, toRows } from "./feedRows";

type RoomMessage = Schemas["RoomMessage"];
type Question = Schemas["AgentQuestion"];

const msg = (id: string, over: Partial<RoomMessage> = {}) =>
  ({ id, questionId: null, taskId: null, ...over }) as RoomMessage;
const question = (id: string, over: Partial<Question> = {}) =>
  ({ id, askerRole: "FRONTEND", targetRole: "BACKEND", ...over }) as Question;

describe("toRows — 같은 질문의 줄은 카드 하나로 묶는다", () => {
  it("같은 questionId의 뒤 줄은 처음 줄의 folded로 들어간다", () => {
    const rows = toRows(
      [msg("1"), msg("2", { questionId: "q1" }), msg("3"), msg("4", { questionId: "q1" })],
      [question("q1")],
    );
    expect(rows.map((r) => r.message.id)).toEqual(["1", "2", "3"]);
    expect(rows[1].question?.id).toBe("q1");
    expect(rows[1].folded.map((m) => m.id)).toEqual(["4"]);
  });

  it("질문 내용을 아직 못 읽었으면 줄마다 따로 둔다", () => {
    const rows = toRows([msg("1", { questionId: "q9" }), msg("2", { questionId: "q9" })], []);
    expect(rows).toHaveLength(2);
    expect(rows[0].question).toBeUndefined();
  });
});

describe("belongsTo — 그 역할의 대화만 남긴다", () => {
  const tasks = [
    { id: "t-fe", teamRole: "FRONTEND" },
    { id: "t-be", teamRole: "BACKEND" },
  ] as Schemas["Task"][];
  const keep = belongsTo(
    "FRONTEND",
    [question("q-mine"), question("q-other", { askerRole: "BACKEND", targetRole: "PM" })],
    tasks,
  );

  it("질문 줄은 묻는 쪽·답하는 쪽 룸에만", () => {
    expect(keep(msg("1", { questionId: "q-mine" }))).toBe(true);
    expect(keep(msg("2", { questionId: "q-other" }))).toBe(false);
  });

  it("태스크 줄은 그 태스크 역할의 룸에만, 모르는 태스크·태스크 없는 줄은 남긴다", () => {
    expect(keep(msg("1", { taskId: "t-fe" }))).toBe(true);
    expect(keep(msg("2", { taskId: "t-be" }))).toBe(false);
    expect(keep(msg("3", { taskId: "t-unknown" }))).toBe(true);
    expect(keep(msg("4"))).toBe(true);
  });
});
