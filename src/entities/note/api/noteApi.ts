import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";
import { mergeNotes } from "../model/api";

export const noteKeys = {
  all: ["note"] as const,
  list: (projectId: string) => [...noteKeys.all, "list", projectId] as const,
};

const LIMIT = 50;

/**
 * 첫 조회는 최신 50개, 이후에는 가진 최대 seq 이후만 받아 앞에 합친다 (architecture.md §4-4). notes 신호 또는 폴링으로 다시 읽는다.
 * ponytail: 4초 사이에 50개 넘게 쌓이면 중간이 빠진다. 그 정도 속도가 나오면 since_seq로 페이지를 넘겨 받을 것
 */
export function useNotes(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = noteKeys.list(projectId);
  return useQuery({
    queryKey,
    queryFn: async () => {
      const prev = queryClient.getQueryData<Schemas["Note"][]>(queryKey);
      const q = new URLSearchParams({ limit: String(LIMIT) });
      if (prev?.length) q.set("since_seq", String(prev[0].seq));
      const { notes } = await apiFetch<{ notes: Schemas["Note"][] }>(`/projects/${projectId}/notes?${q}`);
      return prev ? mergeNotes(notes, prev) : notes;
    },
    refetchInterval: livePoll(4000),
    refetchIntervalInBackground: false,
  });
}
