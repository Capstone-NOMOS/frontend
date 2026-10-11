import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, livePoll, type Schemas } from "@/shared/api";

type AgentQuestion = Schemas["AgentQuestion"];
/** pending = 사람이 답해야 함 · agent_answered = 에이전트가 답함(사람 확인 권장) */
type Status = "pending" | "agent_answered";

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
