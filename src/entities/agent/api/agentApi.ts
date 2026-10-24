import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

export const agentKeys = {
  all: ["agent"] as const,
  org: (orgId: string) => [...agentKeys.all, "org", orgId] as const,
  device: (userCode: string) => [...agentKeys.all, "device", userCode] as const,
};

/** 에이전트 CLI (backend#7). npx가 캐시한 옛 버전이 바뀐 서버 API로 실행되지 않게 @latest를 붙인다 */
export const CLI_NPX = "npx @capstone-nomos/cli@latest";

/**
 * 1회용 연결 명령 발급 (로그인만 하면 됨, 조직 가입 전에도). 노트북에 다른 계정 자격 증명이 남아 있어도 이 계정으로 연결된다.
 * 10분 · 1회용이고 부를 때마다 새 코드다. command를 그대로 보여준다
 */
export function useCreateConnectCode() {
  return useMutation({
    mutationFn: () => apiFetch<Schemas["AgentConnectCode"]>("/me/agent-connect-codes", { method: "POST" }),
  });
}

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

/**
 * 연결 해제 (에이전트 주인·대표). 맡은 진행 중 프로젝트에서도 빠지고 GitHub 접근을 회수한다.
 * 진행 중 태스크를 붙잡고 있으면 409 ACTIVE_TASKS_HELD. 같은 노트북에서 다시 connect하면 되살아난다
 */
export function useDisconnectAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) =>
      apiFetch<{
        agentId: string;
        unassignedFrom: string | null;
        githubRevocations: Schemas["GithubRevokeResult"][];
      }>(`/agents/${agentId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.all }),
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
