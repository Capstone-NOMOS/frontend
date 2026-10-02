import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, type RequestBody, type Schemas } from "@/shared/api";
import type { ApiCreateOrgResult, ApiInvite } from "../model/api";

export const orgKeys = {
  all: ["org"] as const,
  members: (orgId: string) => [...orgKeys.all, "members", orgId] as const,
};

/**
 * 조직 생성 뒤에는 /me를 다시 부른다 (BE 설명: 조직·역할은 매 요청 DB가 정본).
 * 조직이 생기면 모든 조회 결과가 달라질 수 있으므로 me만이 아니라 전부 무효화한다.
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestBody<"/orgs", "post">) => apiFetch<ApiCreateOrgResult>("/orgs", { method: "POST", body }),
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

/** 대표 전용 (그 외 403 NOT_REPRESENTATIVE). 발급 목록 API가 없어 무효화할 쿼리도 없다 */
export function useCreateInvite(orgId: string) {
  return useMutation({
    mutationFn: (body: RequestBody<"/orgs/{orgId}/invites", "post">) =>
      apiFetch<ApiInvite>(`/orgs/${orgId}/invites`, { method: "POST", body }),
  });
}
