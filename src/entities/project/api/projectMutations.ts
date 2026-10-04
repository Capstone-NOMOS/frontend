import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, type RequestBody, type Schemas } from "@/shared/api";
import { projectKeys } from "./projectApi";

/** 대표 전용. 성공하면 projects 목록을 다시 부른다 */
export function useCreateProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestBody<"/orgs/{orgId}/projects", "post">) =>
      apiFetch<Schemas["ProjectDetail"]>(`/orgs/${orgId}/projects`, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(orgId) }),
  });
}

/**
 * 배정·해제·시작 뒤에는 프로젝트 상세(members·status·startedAt)와 목록을 다시 부른다.
 * 에이전트 목록(assignment)은 entities/agent의 키라 여기서 import할 수 없다 — 위젯이 무효화한다
 */
function useInvalidateProject(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: [...projectKeys.all, "list"] }),
    ]);
}

// 다른 탭에서 이미 시작한 경우 등: 화면이 옛 상태를 보고 있으므로 상세를 다시 부른다
const STALE_CODES = new Set(["PROJECT_STARTED", "PROJECT_ALREADY_STARTED"]);

function useRefetchOnStale(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return (error: Error) => {
    if (error instanceof ApiError && STALE_CODES.has(error.code)) return invalidate();
  };
}

/** 대표 전용. 응답 notice: 배정된 에이전트는 토큰을 재발급해야 태스크·노트 API를 쓸 수 있다 */
export function useAssignMember(projectId: string) {
  return useMutation({
    mutationFn: (body: RequestBody<"/projects/{projectId}/members", "post">) =>
      apiFetch<{ members: Schemas["ProjectMember"][]; notice: string }>(`/projects/${projectId}/members`, {
        method: "POST",
        body,
      }),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/** 대표 전용. 역할 교체는 해제 후 재배정 (UPDATE 경로가 없다) */
export function useUnassignMember(projectId: string) {
  return useMutation({
    mutationFn: (agentId: string) =>
      apiFetch<{ members: Schemas["ProjectMember"][] }>(`/projects/${projectId}/members/${agentId}`, {
        method: "DELETE",
      }),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/**
 * G1. 대표 전용. 이 순간부터 에이전트가 태스크를 가져간다. 시작 후에는 멤버를 바꿀 수 없다.
 * 422 PROJECT_START_INVALID는 details에 이유가 전부 온다 (errorDetails)
 */
export function useStartProject(projectId: string) {
  return useMutation({
    mutationFn: () => apiFetch<Schemas["ProjectDetail"]>(`/projects/${projectId}/start`, { method: "POST" }),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}
