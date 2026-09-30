import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api";
import { sortVerifications, type ApiArtifact, type ApiVerification } from "../model/api";

export const artifactKeys = {
  all: ["artifact"] as const,
  list: (taskId: string) => [...artifactKeys.all, "list", taskId] as const,
  verifications: (artifactId: string) => [...artifactKeys.all, "verifications", artifactId] as const,
};

// V2·V4는 브릿지가 제출 뒤에 보고하므로 태스크 상세를 보는 동안 계속 갱신한다
const POLL = { refetchInterval: 4000, refetchIntervalInBackground: false } as const;

/** attempt 내림차순 (최신 먼저) */
export function useArtifacts(taskId: string) {
  return useQuery({
    queryKey: artifactKeys.list(taskId),
    queryFn: () => apiFetch<{ artifacts: ApiArtifact[] }>(`/tasks/${taskId}/artifacts`),
    select: (data) => data.artifacts,
    ...POLL,
  });
}

/** 실행 순서(V1A → V1B → V3 → V2 → V4 → INTEGRATION)로 정렬해 돌려준다 */
export function useVerifications(artifactId: string | null) {
  return useQuery({
    queryKey: artifactKeys.verifications(artifactId ?? ""),
    queryFn: () => apiFetch<{ verifications: ApiVerification[] }>(`/artifacts/${artifactId}/verifications`),
    select: (data) => sortVerifications(data.verifications),
    enabled: artifactId !== null,
    ...POLL,
  });
}
