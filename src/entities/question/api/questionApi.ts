import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

type AgentQuestion = Schemas["AgentQuestion"];
/** pending = 사람이 답해야 함 · agent_answered = 에이전트가 답함(사람 확인 권장) · all = 룸 피드의 질문 카드용 */
type Status = "pending" | "agent_answered" | "all";

export const questionKeys = {
  all: ["question"] as const,
  mine: (status: Status) => [...questionKeys.all, "mine", status] as const,
  project: (projectId: string, status: Status) => [...questionKeys.all, "project", projectId, status] as const,
};

const POLL = { refetchInterval: livePoll(5000), refetchIntervalInBackground: false } as const;

/** 내가 답할 수 있는 질문 (최신순). 대표는 조직 전체, 팀원은 자기 역할이 답할 질문만. 알림 배지용 */
export function useMyQuestions(status: Status = "pending") {
  return useQuery({
    queryKey: questionKeys.mine(status),
    queryFn: () =>
      apiFetch<{ questions: { question: AgentQuestion; projectName: string; taskTitle: string }[] }>(
        `/me/questions?status=${status}`,
      ),
    select: (data) => data.questions,
    ...POLL,
  });
}

/** 프로젝트의 질문 (최신순). 볼 수 있는 범위는 태스크와 같다 — 답할 수 있는지는 targetRole로 따로 본다 */
export function useProjectQuestions(projectId: string, status: Status = "pending") {
  return useQuery({
    queryKey: questionKeys.project(projectId, status),
    queryFn: () => apiFetch<{ questions: AgentQuestion[] }>(`/projects/${projectId}/questions?status=${status}`),
    select: (data) => data.questions,
    ...POLL,
  });
}

/**
 * 답하기. 낙관적 업데이트 없이 서버 응답으로만 바뀐다. answers의 키는 질문 문장 그대로여야 한다 (다르면 422 QUESTION_INVALID).
 * agent_answered 질문에 같은 답을 보내면 확인, 다른 답이면 뒤집기다.
 * 409 QUESTION_CLOSED도 상태가 바뀐 것이라 성공·실패 모두 목록을 다시 읽는다
 */
export function useAnswerQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, string> }) =>
      apiFetch<AgentQuestion>(`/questions/${id}/answer`, { method: "POST", body: { answers } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: questionKeys.all }),
  });
}

/** 대표 전용 평가. 답이 끝난 질문에 정답 담당자를 붙인다 (SELF = 질문한 쪽 소관). 라우팅 보고서만 바뀐다 */
export function useSetGold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; target: "FRONTEND" | "BACKEND" | "PM" | "SELF"; note?: string }) =>
      apiFetch<{ questionId: string; goldTarget: "FRONTEND" | "BACKEND" | "PM" | "SELF" }>(`/questions/${id}/gold`, {
        method: "POST",
        body,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: questionKeys.all }),
  });
}

/** 대표 전용 라우팅 평가 보고서. 키를 questionKeys 아래에 둬 questions 신호로 함께 다시 읽는다 */
export function useRoutingReport(projectId: string, enabled = true) {
  return useQuery({
    queryKey: [...questionKeys.all, "routing-report", projectId] as const,
    queryFn: () => apiFetch<Schemas["RoutingReport"]>(`/projects/${projectId}/routing-report`),
    enabled,
  });
}

type DecisionRole = "FRONTEND" | "BACKEND" | "PM";

/** 서버 상한. 커서가 없어 더 보기는 limit을 늘려 처음부터 다시 받는다 */
export const DECISIONS_MAX = 200;

/**
 * 질문으로 정해진 결정 (질문 문장 하나당 한 줄, 답한 시각 최신순). 키를 questionKeys 아래에 둬 questions 신호로 함께 다시 읽는다.
 * ponytail: 200줄이 상한이다 — 넘어가면 BE에 커서(before=answeredAt)를 요청할 것
 */
export function useDecisions(projectId: string, role: DecisionRole | null, limit: number) {
  return useQuery({
    queryKey: [...questionKeys.all, "decisions", projectId, role ?? "all", limit] as const,
    queryFn: () => {
      const q = new URLSearchParams({ limit: String(limit) });
      if (role) q.set("role", role);
      return apiFetch<{ decisions: Schemas["QuestionDecision"][] }>(`/projects/${projectId}/decisions?${q}`);
    },
    select: (data) => data.decisions,
    // 더 보기를 누르는 동안 이미 보던 줄을 지우지 않는다
    placeholderData: keepPreviousData,
    ...POLL,
  });
}
