import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";

export const agentKeys = {
  all: ["agent"] as const,
  org: (orgId: string) => [...agentKeys.all, "org", orgId] as const,
  device: (userCode: string) => [...agentKeys.all, "device", userCode] as const,
  cliPublished: () => [...agentKeys.all, "cli-published"] as const,
};

export const CLI_PACKAGE = "@capstone-nomos/cli";

/**
 * CLI가 npm에 배포됐는지 (Capstone-NOMOS/backend#7). 배포 전에는 레포를 클론하는 방식으로 안내한다.
 * 레지스트리는 없는 패키지에 CORS 헤더 없는 404를 주므로, 실패는 전부 "아직 없음"으로 본다
 */
export function useCliPublished() {
  return useQuery({
    queryKey: agentKeys.cliPublished(),
    queryFn: async () => {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(CLI_PACKAGE)}`, {
        headers: { Accept: "application/vnd.npm.install-v1+json" },
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** 조직의 에이전트 목록. 접속 상태(online/offline)는 API가 주지 않는다 — 목록에 있으면 "연결한 적 있음" */
export function useOrgAgents(orgId: string | null, { poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: agentKeys.org(orgId ?? ""),
    queryFn: () => apiFetch<{ agents: Schemas["OrgAgent"][] }>(`/orgs/${orgId}/agents`),
    enabled: orgId !== null,
    refetchInterval: poll ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}

const devicePath = (userCode: string) => `/agents/device/requests/${encodeURIComponent(userCode)}`;

/** CLI가 연 승인 링크의 요청. 승인 결과는 CLI가 폴링으로 가져가므로 화면은 폴링하지 않는다 */
export function useDeviceRequest(userCode: string | null) {
  return useQuery({
    queryKey: agentKeys.device(userCode ?? ""),
    queryFn: () => apiFetch<Schemas["DeviceRequest"]>(devicePath(userCode!)),
    enabled: userCode !== null,
  });
}

// 승인·거부 응답 본문은 쓰지 않는다. 결과 상태는 invalidate 뒤 조회로 다시 읽는다
export function useApproveDeviceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCode: string) => apiFetch<unknown>(`${devicePath(userCode)}/approve`, { method: "POST" }),
    onSuccess: (_, userCode) => queryClient.invalidateQueries({ queryKey: agentKeys.device(userCode) }),
  });
}

export function useDenyDeviceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCode: string) => apiFetch<unknown>(`${devicePath(userCode)}/deny`, { method: "POST" }),
    onSuccess: (_, userCode) => queryClient.invalidateQueries({ queryKey: agentKeys.device(userCode) }),
  });
}
