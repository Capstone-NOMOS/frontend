import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

export const inboxKeys = {
  all: ["inbox"] as const,
  notifications: () => [...inboxKeys.all, "notifications"] as const,
  items: () => [...inboxKeys.all, "items"] as const,
};

const POLL = { refetchInterval: livePoll(30000), refetchIntervalInBackground: false } as const;

/** 알림 — 일어난 일 (최신순, 최근 30일). 내가 직접 한 일은 오지 않는다. id는 큰 정수라 문자열 그대로 다룬다 */
export function useNotifications() {
  return useQuery({
    queryKey: inboxKeys.notifications(),
    queryFn: () =>
      apiFetch<{ notifications: Schemas["Notification"][]; unreadCount: number }>("/me/notifications?limit=30"),
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
