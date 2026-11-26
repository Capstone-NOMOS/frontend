import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, clearSession, setSession, type RequestBody, type Schemas } from "@/shared/api";

export const userKeys = {
  all: ["user"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

/** 조직·역할은 매 요청 DB가 정본이다. 조직 생성·초대 수락 뒤에는 invalidate한다 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => apiFetch<Schemas["Me"]>("/me"),
    staleTime: Infinity,
    enabled,
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (body: RequestBody<"/auth/signup", "post">) =>
      apiFetch<Schemas["SignupResult"]>("/auth/signup", { method: "POST", body, auth: false }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestBody<"/auth/login", "post">) =>
      apiFetch<Schemas["LoginResult"]>("/auth/login", { method: "POST", body, auth: false }),
    onSuccess: ({ accessToken, expiresIn }) => {
      setSession({ accessToken, expiresAt: Date.now() + expiresIn * 1000 });
      // 이전 사용자의 me가 남아 있으면 안 된다
      queryClient.removeQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * 랜딩으로 나간다. 화면 안 이동이 아니라 새로 불러온다 — 세션을 지우는 순간 AuthGate가 먼저
 * /login?next=…로 보낼 수 있고, 새로 불러오면 쿼리 캐시·웹소켓도 함께 정리된다
 */
export function useLogout() {
  return () => {
    clearSession();
    window.location.replace("/");
  };
}
