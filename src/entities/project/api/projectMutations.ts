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

// 다른 탭에서 이미 시작·배정·해제한 경우 등: 화면이 옛 상태를 보고 있으므로 상세를 다시 부른다
const STALE_CODES = new Set([
  "PROJECT_STARTED",
  "PROJECT_ALREADY_STARTED",
  "ROLE_ALREADY_ASSIGNED",
  "AGENT_ALREADY_ASSIGNED",
  "AGENT_IN_ANOTHER_PROJECT",
  "MEMBER_NOT_FOUND",
  "PROJECT_NOT_OPEN",
]);

function useRefetchOnStale(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return (error: Error) => {
    if (error instanceof ApiError && STALE_CODES.has(error.code)) return invalidate();
  };
}

/**
 * 대표 전용. 응답 notice: 배정된 에이전트는 토큰을 재발급해야 태스크·노트 API를 쓸 수 있다.
 * 서버가 에이전트 주인을 프로젝트의 GitHub 레포에 협업자로 초대한다 — 결과는 members[].githubInvites에도 남는다
 */
export function useAssignMember(projectId: string) {
  return useMutation({
    mutationFn: (body: RequestBody<"/projects/{projectId}/members", "post">) =>
      apiFetch<{ members: Schemas["ProjectMember"][]; githubInvites: Schemas["GithubInviteResult"][]; notice: string }>(
        `/projects/${projectId}/members`,
        { method: "POST", body },
      ),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/**
 * 대표 전용. 역할 교체는 해제 후 재배정 (UPDATE 경로가 없다). 시작 뒤에도 된다.
 * 진행 중 태스크를 붙잡고 있으면 409 ACTIVE_TASKS_HELD. 응답 githubRevocations는 그 프로젝트 레포의 접근 회수 결과
 */
export function useUnassignMember(projectId: string) {
  return useMutation({
    mutationFn: (agentId: string) =>
      apiFetch<{ members: Schemas["ProjectMember"][]; githubRevocations: Schemas["GithubRevokeResult"][] }>(
        `/projects/${projectId}/members/${agentId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/** 대표 전용. GitHub 협업자 초대 다시 보내기. 시작 뒤에도 된다. 초대가 실패해도 200이고 결과는 githubInvites에 적힌다 */
export function useResendGithubInvite(projectId: string) {
  return useMutation({
    mutationFn: (agentId: string) =>
      apiFetch<{ githubInvites: Schemas["GithubInviteResult"][] }>(
        `/projects/${projectId}/members/${agentId}/github-invite`,
        { method: "POST" },
      ),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/**
 * 대표 전용. 진행 중(planning·active·halted) 프로젝트를 aborted로 닫는다 — 지우지 않는다.
 * 에이전트·레포가 풀리고, 대기 질문은 만료, 대기 승인은 대기열에서 빠진다. 이미 끝났으면 409 PROJECT_NOT_OPEN
 */
export function useAbortProject(projectId: string) {
  return useMutation({
    mutationFn: (body: { reason?: string | null }) =>
      apiFetch<{ project: Schemas["Project"] }>(`/projects/${projectId}/abort`, { method: "POST", body }),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/** 대표 전용, 시작 전에만 (시작 뒤 403 PROJECT_STARTED). 지금은 질문 중계 스위치뿐이다 */
export function useUpdateProjectSettings(projectId: string) {
  return useMutation({
    mutationFn: (body: RequestBody<"/projects/{projectId}/settings", "patch">) =>
      apiFetch<Schemas["Project"]>(`/projects/${projectId}/settings`, { method: "PATCH", body }),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}

/**
 * G1. 대표 전용. 이 순간부터 에이전트가 태스크를 가져간다.
 * 422 PROJECT_START_INVALID는 details에 이유가 전부 온다 (errorDetails)
 */
export function useStartProject(projectId: string) {
  return useMutation({
    mutationFn: () => apiFetch<Schemas["ProjectDetail"]>(`/projects/${projectId}/start`, { method: "POST" }),
    onSuccess: useInvalidateProject(projectId),
    onError: useRefetchOnStale(projectId),
  });
}
