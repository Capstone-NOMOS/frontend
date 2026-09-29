import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, type RequestBody } from "@/shared/api";
import type { ApiCreateOrgResult } from "../model/api";

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
