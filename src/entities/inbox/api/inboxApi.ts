import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

export const inboxKeys = {
  all: ["inbox"] as const,
  notifications: () => [...inboxKeys.all, "notifications"] as const,
  items: () => [...inboxKeys.all, "items"] as const,
};

const POLL = { refetchInterval: livePoll(30000), refetchIntervalInBackground: false } as const;

const LIMIT = 30;

type NotificationPage = { notifications: Schemas["Notification"][]; unreadCount: number };

// 훅 밖에 둔다 (eventApi.ts와 같은 이유). 안 읽은 수는 매 페이지 같은 값이라 첫 페이지 것을 쓴다
const flatten = (data: { pages: NotificationPage[] }): NotificationPage => ({
  notifications: data.pages.flatMap((p) => p.notifications),
  unreadCount: data.pages[0]?.unreadCount ?? 0,
});

/**
 * 알림 — 일어난 일 (최신순, 최근 30일). 내가 직접 한 일은 오지 않는다. id는 큰 정수라 문자열 그대로 다룬다.
 * "더 보기"는 이전 응답의 마지막 id를 before로 보낸다. 응답에 다음 커서가 없어서 꽉 찬 페이지면 더 있다고 본다
 */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: inboxKeys.notifications(),
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: String(LIMIT) });
      if (pageParam) q.set("before", pageParam);
      return apiFetch<NotificationPage>(`/me/notifications?${q}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.notifications.length === LIMIT ? (last.notifications.at(-1)?.id ?? null) : null),
    select: flatten,
    ...POLL,
  });
}

/** 처리할 일 — 지금 내가 손대야 하는 일 (오래된 것부터). 처리하면 저절로 빠진다. 진행 중 프로젝트의 일만 */
export function useMyInbox() {
  return useQuery({
    queryKey: inboxKeys.items(),
    queryFn: () => apiFetch<{ items: Schemas["InboxItem"][]; counts: Record<string, number> }>("/me/inbox"),
    ...POLL,
  });
}

/** 그 이벤트 id까지 읽음. 읽음은 앞으로만 간다 — 더 작은 id를 보내도 되돌아가지 않는다 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (upToEventId: string) =>
      apiFetch<{ readUpToEventId: string; unreadCount: number }>("/me/notifications/read", {
        method: "POST",
        body: { upToEventId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inboxKeys.notifications() }),
  });
}
