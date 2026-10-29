"use client";

import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage, type Schemas } from "@/shared/api";
import { EmptyState, SectionTitle } from "@/shared/ui";
import { useOrgAgents } from "@/entities/agent";
import { ApprovalCard, canDecideApproval, useProjectApprovals } from "@/entities/approval";
import { EventRow, describeEvent, makeEventLookup, useProjectEvents } from "@/entities/event";
import { useOrgMembers } from "@/entities/org";
import { projectKeys, useProject } from "@/entities/project";
import { QuestionCard, useProjectQuestions } from "@/entities/question";
import { taskKeys, useTasks } from "@/entities/task";
import { displayName, useCurrentUser } from "@/entities/user";

/** 내 결정이 필요한 승인 카드, 에이전트가 물은 질문, 주의가 필요한 최근 일(실패·거부·반려 등) */
export function InboxView({ projectId }: { projectId: string }) {
  // AuthGate·AppShell 안쪽이므로 me가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const queryClient = useQueryClient();
  const approvals = useProjectApprovals(projectId);
  // 내 차례: 대표는 최종 카드, 팀원은 내가 검토자인 1차 카드. 나머지(대표에게는 담당 검토 중 — 대신 처리할 수 있다)는 아래 칸
  const mine = (approvals.data ?? []).filter(
    (a) => canDecideApproval(a, me.userId, isRep) && !(isRep && a.stage === "role_review"),
  );
  const others = (approvals.data ?? []).filter((a) => !mine.includes(a));
  const onDecided = () => {
    // 승인·반려로 태스크 상태가, G3면 프로젝트 상태가 바뀐다 (entities끼리 키를 못 쓰므로 위젯에서 무효화)
    void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    void queryClient.invalidateQueries({ queryKey: projectKeys.all });
  };
  const events = useProjectEvents(projectId);
  const pending = useProjectQuestions(projectId, "pending");
  const agentAnswered = useProjectQuestions(projectId, "agent_answered");
  // 답할 수 있는 사람: 답할 역할의 담당자와 대표 (최종 판정은 403 NOT_QUESTION_TARGET)
  const myTeamRole = useProject(projectId).data?.members.find((m) => m.userId === me.userId)?.teamRole;
  const questions = [...(pending.data ?? []), ...(agentAnswered.data ?? [])];
  const tasks = useTasks(projectId).data;
  const agents = useOrgAgents(me.orgId).data?.agents;
  const members = useOrgMembers(me.orgId!).data;
  const lookup = makeEventLookup(tasks, agents, members);
  const notices = (events.data ?? []).filter((e) => describeEvent(e, lookup).tone !== "default").slice(0, 20);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">받은 편지함</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          {displayName(me)} 님{isRep ? "의 결정이 필요한 항목" : "이 확인할 항목"}과 알림입니다.
        </p>

        <section className="mt-6">
          <SectionTitle>
            {isRep ? "최종 승인 대기" : "검토 요청"} · {mine.length}
          </SectionTitle>
          {approvals.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : approvals.isError ? (
            <EmptyState title={errorMessage(approvals.error)} />
          ) : mine.length === 0 ? (
            <EmptyState
              title="처리할 항목이 없습니다"
              desc={
                isRep
                  ? "역할 담당의 1차 검토를 통과한 산출물(담당이 없으면 바로)이 여기에 모입니다."
                  : "내가 맡은 역할의 산출물이 검증을 통과하면 여기서 먼저 검토합니다."
              }
            />
          ) : (
            <ApprovalList approvals={mine} projectId={projectId} canDecide onDecided={onDecided} />
          )}
        </section>

        {others.length > 0 && (
          <section className="mt-8">
            <SectionTitle>
              {isRep ? "담당 검토 중" : "승인 진행 중"} · {others.length}
            </SectionTitle>
            {isRep && (
              <p className="mb-2 text-[12.5px] text-ink-500">
                대신 처리할 수 있습니다. 대신 승인해도 최종 승인 카드가 다시 생기므로 한 번 더 승인해야 합니다.
              </p>
            )}
            <ApprovalList approvals={others} projectId={projectId} canDecide={isRep} onDecided={onDecided} />
          </section>
        )}

        <section className="mt-8">
          <SectionTitle>에이전트 질문 · {questions.length}</SectionTitle>
          {pending.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : pending.isError ? (
            <EmptyState title={errorMessage(pending.error)} />
          ) : questions.length === 0 ? (
            <EmptyState
              title="답할 질문이 없습니다"
              desc="에이전트가 다른 역할이 정해야 할 결정을 물으면 여기에 모입니다. 에이전트가 대신 답한 질문도 확인할 수 있습니다."
            />
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => (
                <li key={q.id}>
                  <QuestionCard
                    question={q}
                    canAnswer={isRep || myTeamRole === q.targetRole}
                    taskHref={`/p/${projectId}/tasks/${q.taskId}`}
                    taskTitle={tasks?.find((t) => t.id === q.taskId)?.title}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <SectionTitle>알림</SectionTitle>
          {events.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : events.isError ? (
            <EmptyState title={errorMessage(events.error)} />
          ) : (
            <ul className="card divide-y divide-ink-100 px-4">
              {notices.map((e) => (
                <EventRow key={e.id} event={e} lookup={lookup} />
              ))}
              {notices.length === 0 && <li className="py-6 text-center text-[13px] text-ink-500">알림이 없습니다</li>}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ApprovalList({
  approvals,
  projectId,
  canDecide,
  onDecided,
}: {
  approvals: Schemas["Approval"][];
  projectId: string;
  canDecide: boolean;
  onDecided: () => void;
}) {
  return (
    <ul className="space-y-2">
      {approvals.map((a) => (
        <li key={a.id}>
          <ApprovalCard
            approval={a}
            canDecide={canDecide}
            taskHref={a.taskId ? `/p/${projectId}/tasks/${a.taskId}` : undefined}
            onDecided={onDecided}
          />
        </li>
      ))}
    </ul>
  );
}
