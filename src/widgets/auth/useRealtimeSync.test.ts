import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { agentKeys } from "@/entities/agent";
import { artifactKeys } from "@/entities/artifact";
import { eventKeys } from "@/entities/event";
import { planKeys } from "@/entities/plan";
import { projectKeys } from "@/entities/project";
import { roomKeys } from "@/entities/room";
import { taskKeys } from "@/entities/task";
import { keysForSignal } from "./useRealtimeSync";

// 화면이 실제로 쓰는 쿼리 키들. 신호가 이 중 무엇을 다시 읽게 하는지를 react-query의 키 매칭으로 확인한다
const SCREEN = {
  projectList: projectKeys.list("org1"),
  projectDetailP1: projectKeys.detail("p1"),
  agents: agentKeys.org("org1"),
  pmStatusP1: planKeys.status("p1"),
  roomListP1: roomKeys.list("p1"),
  roomFeedP1: roomKeys.feed("p1", "FRONTEND"),
  tasksP1: taskKeys.list("p1", {}),
  tasksP2: taskKeys.list("p2", {}),
  artifactsT1: artifactKeys.list("t1"),
  verificationsA1: artifactKeys.verifications("a1"),
  eventsP1: eventKeys.list("p1"),
} satisfies Record<string, QueryKey>;

type Screen = keyof typeof SCREEN;

/** 신호를 받았을 때 다시 읽게 되는 화면 쿼리 */
async function invalidatedBy(projectId: string | null, topics: string[]) {
  const queryClient = new QueryClient();
  for (const key of Object.values(SCREEN)) queryClient.setQueryData(key, "cached");

  await Promise.all(keysForSignal(projectId, topics).map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  return (Object.keys(SCREEN) as Screen[]).filter((name) => queryClient.getQueryState(SCREEN[name])?.isInvalidated);
}

describe("keysForSignal — 실시간 신호가 다시 읽게 하는 쿼리", () => {
  it("조직 agents 신호는 에이전트뿐 아니라 프로젝트 목록 · PM 상태 · 룸까지 다시 읽는다", async () => {
    // 팀원이 배정되면 프로젝트 목록이 바뀌는데 그 신호는 agents로만 온다
    expect(await invalidatedBy(null, ["agents"])).toEqual<Screen[]>([
      "projectList",
      "agents",
      "pmStatusP1",
      "roomListP1",
      "roomFeedP1",
    ]);
  });

  it("조직 projects 신호는 목록만 다시 읽고 열려 있는 프로젝트 상세는 건드리지 않는다", async () => {
    expect(await invalidatedBy(null, ["projects"])).toEqual<Screen[]>(["projectList"]);
  });

  it("프로젝트 tasks 신호는 그 프로젝트의 태스크 목록과 산출물 · 검증을 다시 읽는다", async () => {
    expect(await invalidatedBy("p1", ["tasks"])).toEqual<Screen[]>(["tasksP1", "artifactsT1", "verificationsA1"]);
  });

  it("프로젝트 questions 신호는 룸 피드도 다시 읽는다 — 질문 줄(재지정 포함)에 room 신호가 같이 오지 않는다", async () => {
    expect(await invalidatedBy("p1", ["questions"])).toEqual<Screen[]>(["pmStatusP1", "roomListP1", "roomFeedP1"]);
  });

  it("다른 프로젝트의 태스크 목록은 다시 읽지 않는다", async () => {
    expect(await invalidatedBy("p2", ["tasks"])).not.toContain("tasksP1");
  });

  it("한 신호에 topic이 여러 개면 전부 반영한다", async () => {
    expect(await invalidatedBy("p1", ["events", "room"])).toEqual<Screen[]>(["roomListP1", "roomFeedP1", "eventsP1"]);
  });

  it("같은 이름의 topic도 조직 신호와 프로젝트 신호에서 뜻이 다르다", async () => {
    // 조직 members = 조직 멤버 목록(여기 화면 목록에는 없다), 프로젝트 members = 그 프로젝트 상세
    expect(await invalidatedBy(null, ["members"])).toEqual([]);
    expect(await invalidatedBy("p1", ["members"])).toEqual<Screen[]>(["projectDetailP1"]);
  });

  it("모르는 topic은 무시한다 — 서버가 topic을 먼저 추가해도 깨지지 않는다", () => {
    expect(keysForSignal(null, ["something_new"])).toEqual([]);
    expect(keysForSignal("p1", ["something_new"])).toEqual([]);
  });
});
