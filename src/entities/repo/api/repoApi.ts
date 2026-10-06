import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type RequestBody, type Schemas } from "@/shared/api";

export const repoKeys = {
  all: ["repo"] as const,
  list: (orgId: string) => [...repoKeys.all, "list", orgId] as const,
  github: (orgId: string) => [...repoKeys.all, "github", orgId] as const,
  paths: (repoId: string) => [...repoKeys.all, "paths", repoId] as const,
};

/** 조직에 연결된 레포 (연결 순서대로). ownershipAssigned가 false면 프로젝트 생성에서 422 REPO_OWNERSHIP_NOT_SET */
export function useRepos(orgId: string) {
  return useQuery({
    queryKey: repoKeys.list(orgId),
    queryFn: () => apiFetch<{ repos: Schemas["RepoListItem"][] }>(`/orgs/${orgId}/repos`),
    select: (data) => data.repos,
  });
}

/** GitHub 앱이 접근할 수 있는 레포. 연동 미설정·조회 실패여도 빈 배열이 온다 */
export function useGithubRepos(orgId: string, enabled = true) {
  return useQuery({
    queryKey: repoKeys.github(orgId),
    queryFn: () => apiFetch<{ repos: Schemas["GithubRepo"][] }>(`/orgs/${orgId}/github/repos`),
    select: (data) => data.repos,
    enabled,
  });
}

/**
 * 연결은 조직 멤버 누구나. ownerRole(`**` 행 소유 역할 지정)은 대표 전용 —
 * 대표가 아닌데 하나라도 넣으면 아무것도 연결하지 않고 403 NOT_REPRESENTATIVE
 */
export function useConnectRepos(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestBody<"/orgs/{orgId}/repos", "post">) =>
      apiFetch<{ repos: Schemas["ConnectedRepo"][] }>(`/orgs/${orgId}/repos`, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: repoKeys.list(orgId) }),
  });
}

/** 경로 규칙 (priority 내림차순 — 위가 이긴다). 시드 15행 + 대표가 추가한 것 */
export function usePaths(repoId: string) {
  return useQuery({
    queryKey: repoKeys.paths(repoId),
    queryFn: () => apiFetch<{ paths: Schemas["RepoPath"][] }>(`/repos/${repoId}/paths`),
    select: (data) => data.paths,
  });
}

// 소유 역할이 바뀌면 목록의 ownershipAssigned도 바뀐다 → 레포 목록까지 무효화
function useInvalidateRepo(repoId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: repoKeys.paths(repoId) }),
      queryClient.invalidateQueries({ queryKey: [...repoKeys.all, "list"] }),
    ]);
}

/** 대표 전용. 성공하면 그 레포를 쓰는 프로젝트의 policy_hash가 바뀌어 이미 발급된 에이전트 토큰이 POLICY_STALE이 된다 */
export function useUpdatePath(repoId: string) {
  const invalidate = useInvalidateRepo(repoId);
  return useMutation({
    mutationFn: ({ pathId, body }: { pathId: string; body: RequestBody<"/repos/{repoId}/paths/{pathId}", "patch"> }) =>
      apiFetch<{ path: Schemas["RepoPath"] }>(`/repos/${repoId}/paths/${pathId}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  });
}

/** 대표 전용. priority는 manual 대역 200~299, 비우면 서버가 대역 최댓값 + 1 */
export function useCreatePath(repoId: string) {
  const invalidate = useInvalidateRepo(repoId);
  return useMutation({
    mutationFn: (body: RequestBody<"/repos/{repoId}/paths", "post">) =>
      apiFetch<{ path: Schemas["RepoPath"] }>(`/repos/${repoId}/paths`, { method: "POST", body }),
    onSuccess: invalidate,
  });
}
