import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

type Contract = Schemas["Contract"];

export const contractKeys = {
  all: ["contract"] as const,
  list: (projectId: string) => [...contractKeys.all, "list", projectId] as const,
};

const pendingPoll = livePoll(5000);

/**
 * 프로젝트의 API 계약 (프로젝트를 볼 수 있는 사람 누구나). 기능 명세를 확정하면 API가 필요한 기능마다 pending으로 생기고
 * BE 노트북의 에이전트가 초안을 쓴다. 실시간 신호 토픽은 contracts — 작성 중(pending)인 동안만 대비용으로 폴링한다
 */
export function useContracts(projectId: string) {
  return useQuery({
    queryKey: contractKeys.list(projectId),
    queryFn: () => apiFetch<{ contracts: Contract[] }>(`/projects/${projectId}/contracts`),
    select: (data) => data.contracts,
    refetchInterval: (query) =>
      query.state.data?.contracts.some((c) => c.status === "pending") ? pendingPoll() : false,
    refetchIntervalInBackground: false,
  });
}

// 낙관적 업데이트 없이 서버 응답으로만 바뀐다. 409(한도·이미 확정)도 상태가 바뀐 것이라 성공·실패 모두 다시 읽는다
function useInvalidateContracts(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: contractKeys.list(projectId) });
}

/** BE 담당(없으면 대표)만. 그 외 403 NOT_CONTRACT_APPROVER. 확정하면 잠긴다 */
export function useApproveContract(projectId: string) {
  return useMutation({
    mutationFn: (contractId: string) => apiFetch<Contract>(`/contracts/${contractId}/approve`, { method: "POST" }),
    onSettled: useInvalidateContracts(projectId),
  });
}

/** draft·failed를 다시 쓰게 한다(pending, attempt + 1). 3회 넘으면 409 CONTRACT_REVISION_LIMIT */
export function useReviseContract(projectId: string) {
  return useMutation({
    mutationFn: ({ contractId, feedback }: { contractId: string; feedback?: string }) =>
      apiFetch<Contract>(`/contracts/${contractId}/revise`, { method: "POST", body: feedback ? { feedback } : {} }),
    onSettled: useInvalidateContracts(projectId),
  });
}
