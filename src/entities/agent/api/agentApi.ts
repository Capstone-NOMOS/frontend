import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";
import type { ApiDeviceDecision, ApiDeviceRequest } from "../model/api";

export const agentKeys = {
  all: ["agent"] as const,
  org: (orgId: string) => [...agentKeys.all, "org", orgId] as const,
  device: (userCode: string) => [...agentKeys.all, "device", userCode] as const,
};

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
    queryFn: () => apiFetch<ApiDeviceRequest>(devicePath(userCode!)),
    enabled: userCode !== null,
  });
}

export function useApproveDeviceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCode: string) =>
      apiFetch<ApiDeviceDecision>(`${devicePath(userCode)}/approve`, { method: "POST" }),
    onSuccess: (_, userCode) => queryClient.invalidateQueries({ queryKey: agentKeys.device(userCode) }),
  });
}

export function useDenyDeviceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCode: string) => apiFetch<ApiDeviceDecision>(`${devicePath(userCode)}/deny`, { method: "POST" }),
    onSuccess: (_, userCode) => queryClient.invalidateQueries({ queryKey: agentKeys.device(userCode) }),
  });
}
