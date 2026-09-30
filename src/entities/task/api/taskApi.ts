import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api";
import type { ApiTask, TaskFilters } from "../model/api";

export const taskKeys = {
  all: ["task"] as const,
  list: (projectId: string, filters: TaskFilters) => [...taskKeys.all, "list", projectId, filters] as const,
};

// 서버 상한. 넘는 프로젝트가 생기면 페이지네이션이 필요하다
const LIMIT = 200;

/** 폴링 4초. 탭이 숨겨지면 멈추고 돌아오면 바로 갱신한다 (architecture.md §4) */
export function useTasks(projectId: string, filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(projectId, filters),
    queryFn: () => {
      const q = new URLSearchParams({ limit: String(LIMIT) });
      if (filters.state) q.set("state", filters.state);
      if (filters.teamRole) q.set("teamRole", filters.teamRole);
      return apiFetch<{ tasks: ApiTask[] }>(`/projects/${projectId}/tasks?${q}`);
    },
    select: (data) => data.tasks,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });
}
