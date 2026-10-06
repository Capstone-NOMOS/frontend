import { useQuery } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";
import { sortVerifications } from "../model/api";

export const artifactKeys = {
  all: ["artifact"] as const,
  list: (taskId: string) => [...artifactKeys.all, "list", taskId] as const,
  verifications: (artifactId: string) => [...artifactKeys.all, "verifications", artifactId] as const,
};

// V2·V4는 브릿지가 제출 뒤에 보고한다. 보고마다 tasks 신호가 오고, 폴링은 끊긴 동안의 대비용 (adr/0009)
const POLL = { refetchInterval: livePoll(4000), refetchIntervalInBackground: false } as const;

/** attempt 내림차순 (최신 먼저) */
export function useArtifacts(taskId: string) {
  return useQuery({
    queryKey: artifactKeys.list(taskId),
    queryFn: () => apiFetch<{ artifacts: Schemas["Artifact"][] }>(`/tasks/${taskId}/artifacts`),
    select: (data) => data.artifacts,
    ...POLL,
  });
}

/** 실행 순서(V1A → V1B → V3 → V2 → V4 → INTEGRATION)로 정렬해 돌려준다 */
export function useVerifications(artifactId: string | null) {
  return useQuery({
    queryKey: artifactKeys.verifications(artifactId ?? ""),
    queryFn: () => apiFetch<{ verifications: Schemas["Verification"][] }>(`/artifacts/${artifactId}/verifications`),
    select: (data) => sortVerifications(data.verifications),
    enabled: artifactId !== null,
    ...POLL,
  });
}
