"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/shared/api";

// 다시 보내도 결과가 같은 응답. 재시도하지 않는다.
const NO_RETRY_STATUS = new Set([401, 403, 404, 409, 410, 422]);

export function Providers({ children }: { children: ReactNode }) {
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
