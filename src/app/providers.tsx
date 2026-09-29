"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, clearSession, setOnUnauthorized } from "@/shared/api";

// 다시 보내도 결과가 같은 응답. 재시도하지 않는다.
const NO_RETRY_STATUS = new Set([401, 403, 404, 409, 410, 422]);

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) =>
              !(error instanceof ApiError && NO_RETRY_STATUS.has(error.status)) && failureCount < 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  // 토큰 만료·위조로 401이 오면 세션을 버리고 로그인으로 보낸다. 로그인 후 원래 경로로 돌아온다
  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession();
      queryClient.clear();
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    });
    return () => setOnUnauthorized(null);
  }, [queryClient, router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
