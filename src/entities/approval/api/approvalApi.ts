import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

type Approval = Schemas["Approval"];
type Status = "pending" | "decided" | "all";

export const approvalKeys = {
  all: ["approval"] as const,
  project: (projectId: string, status: Status) => [...approvalKeys.all, "project", projectId, status] as const,
};

/**
 * 프로젝트의 승인 카드 (요청 최신순). 팀원도 볼 수 있다.
 * 한 태스크에 1차 검토(role_review) 카드와 최종(final) 카드가 차례로 생긴다 — 누가 결정하는지는 canDecideApproval
 */
export function useProjectApprovals(projectId: string, status: Status = "pending") {
  return useQuery({
    queryKey: approvalKeys.project(projectId, status),
    queryFn: () => apiFetch<{ approvals: Approval[] }>(`/projects/${projectId}/approvals?status=${status}`),
    select: (data) => data.approvals,
    refetchInterval: livePoll(5000),
    refetchIntervalInBackground: false,
  });
}

/**
 * 승인·반려. 낙관적 업데이트 없이 서버 응답으로만 바뀐다.
 * 승인은 메모(note, 선택), 반려는 사유(reason, 필수). 1차 승인의 메모는 최종 카드의 roleReview.note로 대표에게 보인다.
 * 409(APPROVAL_STALE·APPROVAL_ALREADY_DECIDED)도 상태가 바뀐 것이라 성공·실패 모두 목록을 다시 읽는다
 */
export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, text }: { id: string; decision: "approve" | "reject"; text?: string }) =>
      apiFetch<Approval>(`/approvals/${id}/${decision}`, {
        method: "POST",
        body: decision === "reject" ? { reason: text } : { ...(text && { note: text }) },
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}
