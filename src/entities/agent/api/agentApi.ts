import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

export const agentKeys = {
  all: ["agent"] as const,
  org: (orgId: string) => [...agentKeys.all, "org", orgId] as const,
  device: (userCode: string) => [...agentKeys.all, "device", userCode] as const,
};

/** 에이전트 CLI (backend#7). npx가 캐시한 옛 버전이 바뀐 서버 API로 실행되지 않게 @latest를 붙인다 */
export const CLI_NPX = "npx @capstone-nomos/cli@latest";

/** 조직의 에이전트 목록. online은 서버 메모리 값이라 서버 재시작 직후 잠깐 false다 (최근 60초 안에 요청이 있으면 true) */
export function useOrgAgents(orgId: string | null, { poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: agentKeys.org(orgId ?? ""),
    queryFn: () => apiFetch<{ agents: Schemas["OrgAgent"][] }>(`/orgs/${orgId}/agents`),
    enabled: orgId !== null,
    refetchInterval: poll ? livePoll(5000) : false,
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

// 승인·거부 응답 본문은 쓰지 않는다. 결과 상태는 invalidate 뒤 조회로 다시 읽는다.
// 실패(409 이미 처리됨 · 410 만료)도 상태가 바뀐 것이므로 성공·실패 모두 다시 읽는다
export function useApproveDeviceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCode: string) => apiFetch<unknown>(`${devicePath(userCode)}/approve`, { method: "POST" }),
    onSettled: (_, __, userCode) => queryClient.invalidateQueries({ queryKey: agentKeys.device(userCode) }),
  });
}

export function useDenyDeviceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCode: string) => apiFetch<unknown>(`${devicePath(userCode)}/deny`, { method: "POST" }),
    onSettled: (_, __, userCode) => queryClient.invalidateQueries({ queryKey: agentKeys.device(userCode) }),
  });
}
