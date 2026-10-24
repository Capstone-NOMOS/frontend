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
 * 대표 전용. 멈춘 태스크(BLOCKED · AGENT_STOPPED, 재시도 횟수 그대로)나 재시도를 다 쓴 태스크(ESCALATED, 재시도 0으로)를 READY로 되돌린다.
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

/** 대표 전용. READY · BLOCKED · ESCALATED만 취소할 수 있다 (CANCELLED). 사유는 룸에 보인다 */
export function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      apiFetch<Schemas["Task"]>(`/tasks/${taskId}/cancel`, { method: "POST", body: { reason } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

/**
 * 그 역할 담당 · 대표. 사람이 태스크 브랜치에 직접 커밋한 것을 완료로 넘긴다 (DONE).
 * 서버가 V3로 실제 diff와 대조해 어긋나면 422 MANUAL_COMPLETION_INVALID — 아무것도 바뀌지 않는다
 */
export function useCompleteTaskManually() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...body }: { taskId: string; commitSha: string; changedPaths: string[]; note?: string }) =>
      apiFetch<Schemas["Task"]>(`/tasks/${taskId}/manual-completion`, { method: "POST", body }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
