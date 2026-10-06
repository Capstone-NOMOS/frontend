"use client";

import { useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useStreamConnection, useStreamSignal, type StreamSignal } from "@/shared/api";
import { agentKeys } from "@/entities/agent";
import { approvalKeys } from "@/entities/approval";
import { artifactKeys } from "@/entities/artifact";
import { eventKeys } from "@/entities/event";
import { noteKeys } from "@/entities/note";
import { orgKeys } from "@/entities/org";
import { planKeys } from "@/entities/plan";
import { projectKeys } from "@/entities/project";
import { repoKeys } from "@/entities/repo";
import { specKeys } from "@/entities/spec";
import { taskKeys } from "@/entities/task";

// 조직 신호(projectId: null). 구독 없이 같은 조직의 모든 연결에 온다
const ORG_TOPICS: Record<string, QueryKey[]> = {
  projects: [[...projectKeys.all, "list"]],
  approvals: [approvalKeys.all],
  // 접속 상태 변화 포함. 팀원이 배정되면 프로젝트 목록이 바뀌는데 그 신호는 agents로만 온다(projects는 안 온다).
  // PM 작업기 접속도 이벤트가 없어 pm/status를 같이 다시 읽는다 (노션 "웹소켓과 폴링의 구분점" ①②)
  agents: [agentKeys.all, [...projectKeys.all, "list"], planKeys.all],
  repos: [repoKeys.all],
  members: [orgKeys.all],
};

// 프로젝트 신호. 그 프로젝트를 구독한 화면에만 온다 (useProjectStream)
const PROJECT_TOPICS: Record<string, (projectId: string) => QueryKey[]> = {
  project: (id) => [projectKeys.detail(id)],
  members: (id) => [projectKeys.detail(id)],
  // 산출물·검증은 태스크 id로 키가 잡혀 있다 — 열려 있는 것만 다시 읽으므로 전부 무효화해도 된다
  tasks: (id) => [[...taskKeys.all, "list", id], artifactKeys.all],
  plans: (id) => [planKeys.project(id)],
  approvals: (id) => [[...approvalKeys.all, "project", id]],
  notes: (id) => [noteKeys.list(id)],
  events: (id) => [eventKeys.list(id)],
  specs: (id) => [specKeys.list(id)],
};

/** 웹소켓 연결을 유지하고, 신호를 쿼리 무효화로 바꾼다. 무효화는 화면에 떠 있는 쿼리만 다시 부른다 */
export function useRealtimeSync(accessToken: string | null) {
  const queryClient = useQueryClient();
  useStreamConnection(accessToken);

  const onSignal = useCallback(
    (s: StreamSignal) => {
      if (s.kind === "resync") return void queryClient.invalidateQueries();
      const keys = s.topics.flatMap((t) =>
        s.projectId ? (PROJECT_TOPICS[t]?.(s.projectId) ?? []) : (ORG_TOPICS[t] ?? []),
      );
      keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
    },
    [queryClient],
  );
  useStreamSignal(onSignal);
}
