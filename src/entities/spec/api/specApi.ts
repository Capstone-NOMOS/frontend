import { useQuery } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";

export const specKeys = {
  all: ["spec"] as const,
  list: (projectId: string) => [...specKeys.all, "list", projectId] as const,
};

/**
 * 프로젝트 명세 (featureKey 순). 사람은 시험지를 전부, 에이전트는 잠긴 것만 본다.
 * 문서라 폴링하지 않는다 — 계획 적용 등으로 바뀌면 specs 신호로 다시 읽는다 (adr/0009)
 */
export function useSpecs(projectId: string) {
  return useQuery({
    queryKey: specKeys.list(projectId),
    queryFn: () => apiFetch<{ specs: Schemas["Spec"][] }>(`/projects/${projectId}/specs`),
    select: (data) => data.specs,
  });
}
