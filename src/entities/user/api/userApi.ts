import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession, setSession, type RequestBody, type Schemas } from "@/shared/api";
import type { ApiConnectKey, ApiSignupResult } from "../model/api";

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
      apiFetch<ApiSignupResult>("/auth/signup", { method: "POST", body, auth: false }),
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

export function useRotateConnectKey() {
  return useMutation({
    mutationFn: () => apiFetch<ApiConnectKey>("/me/connect-key/rotate", { method: "POST" }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => {
    router.replace("/login");
    clearSession();
    queryClient.clear();
  };
}
