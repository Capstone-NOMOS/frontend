import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";

type Approval = Schemas["Approval"];
type Status = "pending" | "decided" | "all";

export const approvalKeys = {
  all: ["approval"] as const,
  project: (projectId: string, status: Status) => [...approvalKeys.all, "project", projectId, status] as const,
};

/** 프로젝트의 승인 카드 (요청 최신순). 팀원도 볼 수 있고, 결정은 대표만 한다 */
export function useProjectApprovals(projectId: string, status: Status = "pending") {
  return useQuery({
    queryKey: approvalKeys.project(projectId, status),
    queryFn: () => apiFetch<{ approvals: Approval[] }>(`/projects/${projectId}/approvals?status=${status}`),
    select: (data) => data.approvals,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}

/**
 * 승인·반려. 낙관적 업데이트 없이 서버 응답으로만 바뀐다.
 * 409(APPROVAL_STALE·APPROVAL_ALREADY_DECIDED)도 상태가 바뀐 것이라 성공·실패 모두 목록을 다시 읽는다
 */
export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: "approve" | "reject"; reason?: string }) =>
      apiFetch<Approval>(`/approvals/${id}/${decision}`, {
        method: "POST",
        ...(decision === "reject" && { body: { reason } }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}
