import {
  replaceEqualDeep,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
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

type RoomMessage = Schemas["RoomMessage"];
type Page = { messages: RoomMessage[]; nextBefore: string | null };

const sameItems = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * 피드의 구조 공유. 새 줄이 하나 오면 페이지 경계가 한 칸씩 밀리는데, 기본 구조 공유는 자리(인덱스)로 비교해서
 * 모든 줄을 새 객체로 만든다 — 같은 id의 줄은 이전 객체를 다시 써서 바뀌지 않은 줄이 다시 그려지지 않게 한다 (docs/perf-room-feed.md).
 * react-query는 이 함수를 쿼리 데이터(페이지들)와 select 결과(줄 배열) 양쪽에 부른다
 */
export function keepMessagesById(prev: unknown, next: unknown): unknown {
  if (prev === undefined) return next;
  if (Array.isArray(next)) return sameItems(prev as RoomMessage[], next) ? prev : next;
  const old = prev as InfiniteData<Page, string | null>;
  const data = next as InfiniteData<Page, string | null>;
  const byId = new Map(old.pages.flatMap((p) => p.messages).map((m) => [m.id, m]));
  const pages = data.pages.map((page, i) => {
    const messages = page.messages.map((m) => {
      const was = byId.get(m.id);
      return was ? replaceEqualDeep(was, m) : m;
    });
    const was = old.pages[i];
    return was && was.nextBefore === page.nextBefore && sameItems(was.messages, messages) ? was : { ...page, messages };
  });
  return sameItems(old.pages, pages) && sameItems(old.pageParams, data.pageParams) ? old : { ...data, pages };
}

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
    structuralSharing: keepMessagesById,
    refetchInterval: livePoll(4000),
    refetchIntervalInBackground: false,
  });
}

/**
 * 룸에서 그 역할의 에이전트에게 말하기 — API는 그 역할 담당 · 대표를 받지만 화면은 담당만 연다(명세 F-07). 실행 중인 에이전트에 바로 끼워 넣지 않고 다음 실행에 전달된다.
 * 에이전트가 없거나 오프라인이어도 받아 둔다. 403 ROOM_NOT_VISIBLE · 409 PROJECT_NOT_OPEN · 400 VALIDATION_ERROR(0자·1000자 초과)
 */
export function useSendRoomMessage(projectId: string, role: TeamRole) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch<Schemas["RoomMessage"]>(`/projects/${projectId}/rooms/${role}/messages`, {
        method: "POST",
        body: { text },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.feed(projectId, role) }),
  });
}
