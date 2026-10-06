import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type RequestBody, type ResponseData, type Schemas } from "@/shared/api";

export type PmStatus = ResponseData<"/projects/{projectId}/pm/status", "get">;

export const planKeys = {
  all: ["plan"] as const,
  project: (projectId: string) => [...planKeys.all, projectId] as const,
  status: (projectId: string) => [...planKeys.project(projectId), "status"] as const,
  list: (projectId: string) => [...planKeys.project(projectId), "list"] as const,
};

/**
 * PM 준비 상태 (대표 전용). 꺼진 pm-worker는 켜면 몇 초 안에 ready가 되고,
 * 작성 중에는 비용(spentUsd)이 바뀌므로 그동안만 5초마다 다시 부른다.
 * 작업기 접속은 이벤트가 없어 실시간 신호가 오지 않는다 — 연결과 상관없이 폴링을 유지한다 (adr/0009)
 */
export function usePmStatus(projectId: string) {
  return useQuery({
    queryKey: planKeys.status(projectId),
    queryFn: () => apiFetch<PmStatus>(`/projects/${projectId}/pm/status`),
    refetchInterval: (query) => {
      const s = query.state.data;
      return s && (!s.ready || s.pendingPlanId) ? 5000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

const pendingPoll = livePoll(4000);

/**
 * 계획 이력 (최근 요청 순, 대표 전용). 응답마다 assignments를 서버가 그 시점의 멤버로 다시 계산한다.
 * PM은 뒤에서 1~3분 돈다 — pending이 있는 동안만 폴링하고(plans 신호가 오면 30초 대비용), ready·failed가 되면 멈춘다
 */
export function usePlans(projectId: string) {
  return useQuery({
    queryKey: planKeys.list(projectId),
    queryFn: () => apiFetch<{ plans: Schemas["PmPlan"][] }>(`/projects/${projectId}/pm/plans`),
    select: (data) => data.plans,
    refetchInterval: (query) => (query.state.data?.plans.some((p) => p.status === "pending") ? pendingPoll() : false),
    refetchIntervalInBackground: false,
  });
}

// 응답(PmPlan)으로 화면을 바로 바꾸지 않는다 — 목록·상태를 다시 불러 서버 상태로만 그린다
function useInvalidatePlans(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: planKeys.project(projectId) });
}

const planPath = (projectId: string, planId: string) => `/projects/${projectId}/pm/plans/${planId}`;

/** 202 pending. 409 PM_PLAN_IN_PROGRESS·PM_BUDGET_EXCEEDED, 503 PM_UNAVAILABLE */
export function useRequestPlan(projectId: string) {
  return useMutation({
    mutationFn: (body: RequestBody<"/projects/{projectId}/pm/plans", "post">) =>
      apiFetch<Schemas["PmPlan"]>(`/projects/${projectId}/pm/plans`, { method: "POST", body }),
    onSettled: useInvalidatePlans(projectId),
  });
}

/** ready 초안 + 피드백으로 새 초안(pending, parentPlanId = 이전 것). 이전 초안은 남는다 */
export function useRevisePlan(projectId: string) {
  return useMutation({
    mutationFn: ({
      planId,
      body,
    }: {
      planId: string;
      body: RequestBody<"/projects/{projectId}/pm/plans/{planId}/revise", "post">;
    }) => apiFetch<Schemas["PmPlan"]>(`${planPath(projectId, planId)}/revise`, { method: "POST", body }),
    onSettled: useInvalidatePlans(projectId),
  });
}

/**
 * 초안을 그대로 명세·태스크(READY)로 만든다. **G1이 아니다** — 프로젝트 상태는 그대로.
 * 422 PLAN_INVALID면 아무것도 만들지 않고 계획은 ready로 남는다 (details)
 */
export function useApplyPlan(projectId: string) {
  return useMutation({
    mutationFn: (planId: string) =>
      apiFetch<Schemas["PmPlan"]>(`${planPath(projectId, planId)}/apply`, { method: "POST" }),
    onSettled: useInvalidatePlans(projectId),
  });
}

/** ready 초안을 닫는다(다시 받지 않음). 고쳐서 다시 받으려면 수정 요청 */
export function useRejectPlan(projectId: string) {
  return useMutation({
    mutationFn: ({ planId, reason }: { planId: string; reason?: string }) =>
      apiFetch<Schemas["PmPlan"]>(`${planPath(projectId, planId)}/reject`, {
        method: "POST",
        body: reason ? { reason } : {},
      }),
    onSettled: useInvalidatePlans(projectId),
  });
}
