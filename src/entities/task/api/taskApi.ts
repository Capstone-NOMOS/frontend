import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";
import type { TaskFilters } from "../model/api";

export const taskKeys = {
  all: ["task"] as const,
  list: (projectId: string, filters: TaskFilters) => [...taskKeys.all, "list", projectId, filters] as const,
};

// 서버 상한. 넘는 프로젝트가 생기면 페이지네이션이 필요하다
const LIMIT = 200;

/** 실시간 신호(tasks)로 다시 읽는다. 폴링은 끊긴 동안 4초, 연결 중 30초 대비용 (adr/0009) */
export function useTasks(projectId: string, filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(projectId, filters),
    queryFn: () => {
      const q = new URLSearchParams({ limit: String(LIMIT) });
      if (filters.state) q.set("state", filters.state);
      if (filters.teamRole) q.set("teamRole", filters.teamRole);
      return apiFetch<{ tasks: Schemas["Task"][] }>(`/projects/${projectId}/tasks?${q}`);
    },
    select: (data) => data.tasks,
    refetchInterval: livePoll(4000),
    refetchIntervalInBackground: false,
  });
}

/**
 * 대표 전용. 에이전트가 제출 없이 멈춘 태스크(BLOCKED · AGENT_STOPPED)를 READY로 되돌린다. 재시도 횟수는 오르지 않는다.
 * 409 TASK_NOT_STOPPED도 상태가 바뀐 것이라 성공·실패 모두 목록을 다시 읽는다
 */
export function useResumeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string }) =>
      apiFetch<Schemas["Task"]>(`/tasks/${taskId}/resume`, { method: "POST", body: note ? { note } : {} }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
