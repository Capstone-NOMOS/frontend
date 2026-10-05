import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";

export const eventKeys = {
  all: ["event"] as const,
  list: (projectId: string) => [...eventKeys.all, "list", projectId] as const,
};

const LIMIT = 30;

type Page = { events: Schemas["ProjectEvent"][]; nextBefore: string | null };

/**
 * 프로젝트 이벤트 로그 (최신순). 대시보드는 첫 페이지만, 활동 화면은 "더 보기"로 nextBefore를 따라간다.
 * ponytail: 폴링 때 받아 둔 페이지를 전부 다시 부른다. 여러 페이지를 펼쳐 둔 채 오래 두면 요청이 늘어난다
 */
export function useProjectEvents(projectId: string) {
  return useInfiniteQuery({
    queryKey: eventKeys.list(projectId),
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: String(LIMIT) });
      if (pageParam) q.set("before", pageParam);
      return apiFetch<Page>(`/projects/${projectId}/events?${q}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
    select: (data) => data.pages.flatMap((p) => p.events),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
