import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";

export const roomKeys = {
  all: ["room"] as const,
  project: (projectId: string) => [...roomKeys.all, projectId] as const,
  list: (projectId: string) => [...roomKeys.project(projectId), "list"] as const,
  feed: (projectId: string, role: TeamRole) => [...roomKeys.project(projectId), "feed", role] as const,
};

/** 내가 볼 수 있는 룸 (FRONTEND, BACKEND 순). 팀원은 자기 에이전트가 배정된 역할 룸만, 대표는 전부 */
export function useRooms(projectId: string) {
  return useQuery({
    queryKey: roomKeys.list(projectId),
    queryFn: () => apiFetch<{ rooms: Schemas["RoomSummary"][] }>(`/projects/${projectId}/rooms`),
    select: (data) => data.rooms,
    refetchInterval: livePoll(5000),
    refetchIntervalInBackground: false,
  });
}

const LIMIT = 50;

type Page = { messages: Schemas["RoomMessage"][]; nextBefore: string | null };

/**
 * 룸 피드 (최신 줄부터). 문장(text)은 서버가 만든다 — 화면은 그대로 보여 준다. 실시간 신호는 room 토픽.
 * 다른 역할의 룸이면 403 ROOM_NOT_VISIBLE
 */
export function useRoomFeed(projectId: string, role: TeamRole) {
  return useInfiniteQuery({
    queryKey: roomKeys.feed(projectId, role),
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: String(LIMIT) });
      if (pageParam) q.set("before", pageParam);
      return apiFetch<Page>(`/projects/${projectId}/rooms/${role}/feed?${q}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
    select: (data) => data.pages.flatMap((p) => p.messages),
    refetchInterval: livePoll(4000),
    refetchIntervalInBackground: false,
  });
}
