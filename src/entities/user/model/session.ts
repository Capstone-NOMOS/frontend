import { useSyncExternalStore } from "react";
import { ApiError, getSession, type Schemas } from "@/shared/api";
import { useMe } from "../api/userApi";

type Me = Schemas["Me"];

export type AuthStatus = "loading" | "anonymous" | "authenticated";

const noSubscribe = () => () => {};

/**
 * 현재 로그인한 사용자. orgId·orgRole은 반드시 이 훅(= /me)으로만 읽는다. 따로 저장하지 말 것.
 * 서버 렌더와 첫 하이드레이션에서는 sessionStorage를 읽을 수 없으므로 loading이다.
 */
export function useCurrentUser(): { status: AuthStatus; me: Me | null; error: unknown; retry: () => void } {
  const hasToken = useSyncExternalStore(
    noSubscribe,
    () => getSession() !== null,
    () => null,
  );
  const meQuery = useMe(hasToken === true);
  const base = { error: null, retry: () => void meQuery.refetch() };

  if (hasToken === null) return { ...base, status: "loading", me: null };
  // 401은 onUnauthorized가 세션을 지운다. 그 외 실패(네트워크·5xx)는 토큰이 유효할 수 있으므로 로그아웃시키지 않는다
  if (!hasToken || (meQuery.error instanceof ApiError && meQuery.error.status === 401)) {
    return { ...base, status: "anonymous", me: null };
  }
  if (meQuery.data) return { ...base, status: "authenticated", me: meQuery.data };
  return { ...base, status: "loading", me: null, error: meQuery.error };
}

export function displayName(me: Me) {
  return me.nickname ?? me.loginId ?? "사용자";
}
