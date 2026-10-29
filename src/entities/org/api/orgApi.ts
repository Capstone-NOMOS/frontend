import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, type RequestBody, type Schemas } from "@/shared/api";

export const orgKeys = {
  all: ["org"] as const,
  members: (orgId: string) => [...orgKeys.all, "members", orgId] as const,
  invites: (orgId: string) => [...orgKeys.all, "invites", orgId] as const,
};

/**
 * 조직 생성 뒤에는 /me를 다시 부른다 (BE 설명: 조직·역할은 매 요청 DB가 정본).
 * 조직이 생기면 모든 조회 결과가 달라질 수 있으므로 me만이 아니라 전부 무효화한다.
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestBody<"/orgs", "post">) =>
      apiFetch<Schemas["OrgCreated"]>("/orgs", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => {
      // 다른 탭에서 이미 합류한 경우. me를 다시 불러 라우팅에 맡긴다
      if (error instanceof ApiError && error.code === "ALREADY_IN_ORG") return queryClient.invalidateQueries();
    },
  });
}

/** isCollaborator는 확인하지 못하면 필드 자체가 없다. false("권한 없음")와 다르다 */
export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: () => apiFetch<{ members: Schemas["Member"][] }>(`/orgs/${orgId}/members`),
    select: (data) => data.members,
  });
}

/** 대표 전용 (그 외 403 NOT_REPRESENTATIVE). 발급하면 대기 중인 초대 목록에 나타난다 */
export function useCreateInvite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestBody<"/orgs/{orgId}/invites", "post">) =>
      apiFetch<Schemas["InviteCreated"]>(`/orgs/${orgId}/invites`, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.invites(orgId) }),
  });
}

/** 대표 전용. 쓰이지도 취소되지도 않은 초대 (최신순). 만료된 것은 expired: true로 함께 온다 */
export function useInvites(orgId: string) {
  return useQuery({
    queryKey: orgKeys.invites(orgId),
    queryFn: () => apiFetch<{ invites: Schemas["PendingInvite"][] }>(`/orgs/${orgId}/invites`),
    select: (data) => data.invites,
  });
}

/** 대표 전용. 취소한 링크는 미리보기 reason: revoked, 수락 410 INVITE_REVOKED. 이미 쓰인 초대는 404 */
export function useRevokeInvite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch<{ inviteId: string }>(`/orgs/${orgId}/invites/${inviteId}`, { method: "DELETE" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: orgKeys.invites(orgId) }),
  });
}

/**
 * userId가 나면 탈퇴, 남이면 내보내기(대표). 계정은 남고 조직만 빠진다 — 그 사람의 에이전트도 해제된다.
 * 탈퇴하면 /me의 orgId가 null이 되어 모든 조회가 달라지므로 전부 다시 읽는다 (AuthGate가 /onboarding으로 보낸다)
 */
export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{
        userId: string;
        agentIds: string[];
        unassignedFrom: string[];
        githubRevocations: Schemas["GithubRevokeResult"][];
      }>(`/orgs/${orgId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/**
 * 대표 전용. 진행 중 프로젝트 중단·초대 취소·레포 해제 후 본인 포함 모든 멤버가 빠진다 (계정은 남는다).
 * 작업 중 태스크가 있으면 409 ACTIVE_TASKS_HELD이고 아무것도 바뀌지 않는다.
 * 성공하면 /me의 orgId가 null이 되므로 전부 다시 읽는다 (AuthGate가 /onboarding으로 보낸다)
 */
export function useDissolveOrg(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ orgId: string; memberCount: number; abortedProjectIds: string[] }>(`/orgs/${orgId}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
