import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";

export const inviteKeys = {
  all: ["invite"] as const,
  preview: (token: string) => [...inviteKeys.all, "preview", token] as const,
};

/**
 * 인증 불필요, 무효한 토큰도 200 + valid:false (404로 토큰 존재를 드러내지 않는다).
 * 훅이 아닌 함수로 두는 이유: page.tsx의 generateMetadata(서버)에서도 부른다 (adr/0007 — 인증 없는 API라 서버 호출 가능)
 */
export function fetchInvitePreview(token: string) {
  return apiFetch<Schemas["InvitePreview"]>(`/invites/${encodeURIComponent(token)}`, { auth: false });
}

export function useInvitePreview(token: string) {
  return useQuery({ queryKey: inviteKeys.preview(token), queryFn: () => fetchInvitePreview(token) });
}

/** 성공하면 조직이 생긴다. /me를 포함해 모든 조회 결과가 달라지므로 전부 무효화한다 (entities끼리 키를 import할 수 없다) */
export function useAcceptInvite(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Schemas["InviteAccepted"]>(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
