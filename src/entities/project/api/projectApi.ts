import { useQuery } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";
import type { ApiProjectDetail } from "../model/api";

export const projectKeys = {
  all: ["project"] as const,
  list: (orgId: string) => [...projectKeys.all, "list", orgId] as const,
  detail: (projectId: string) => [...projectKeys.all, "detail", projectId] as const,
};

/**
 * 대표는 조직 전체, 팀원은 자기 에이전트가 배정된 것만 (최근 생성 순).
 * pollWhileEmpty: 배정을 기다리는 팀원 화면. 목록이 비어 있는 동안만 10초마다 다시 부른다
 */
export function useProjects(orgId: string, { pollWhileEmpty = false } = {}) {
  return useQuery({
    queryKey: projectKeys.list(orgId),
    queryFn: () => apiFetch<{ projects: Schemas["Project"][] }>(`/orgs/${orgId}/projects`),
    select: (data) => data.projects,
    refetchInterval: (query) => (pollWhileEmpty && query.state.data?.projects.length === 0 ? 10_000 : false),
    refetchIntervalInBackground: false,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => apiFetch<ApiProjectDetail>(`/projects/${projectId}`),
  });
}
