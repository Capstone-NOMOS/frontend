"use client";

import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/shared/api";
import { EmptyState, SectionTitle } from "@/shared/ui";
import { useOrgAgents } from "@/entities/agent";
import { ApprovalCard, useProjectApprovals } from "@/entities/approval";
import { EventRow, describeEvent, makeEventLookup, useProjectEvents } from "@/entities/event";
import { useOrgMembers } from "@/entities/org";
import { taskKeys, useTasks } from "@/entities/task";
import { displayName, useCurrentUser } from "@/entities/user";

/** 내 결정이 필요한 승인 카드와, 주의가 필요한 최근 일(실패·거부·반려 등) */
export function InboxView({ projectId }: { projectId: string }) {
  // AuthGate·AppShell 안쪽이므로 me가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const queryClient = useQueryClient();
  const approvals = useProjectApprovals(projectId);
  const events = useProjectEvents(projectId);
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
          <SectionTitle>승인 대기 · {approvals.data?.length ?? 0}</SectionTitle>
          {approvals.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : approvals.isError ? (
            <EmptyState title={errorMessage(approvals.error)} />
          ) : approvals.data.length === 0 ? (
            <EmptyState
              title="처리할 항목이 없습니다"
              desc="정책상 사람 승인이 필요한 산출물이 검증을 통과하면 여기에 모입니다."
            />
          ) : (
            <ul className="space-y-2">
              {approvals.data.map((a) => (
                <li key={a.id}>
                  <ApprovalCard
                    approval={a}
                    canDecide={isRep}
                    taskHref={`/p/${projectId}/tasks/${a.taskId}`}
                    // 승인·반려로 태스크 상태가 바뀐다 (entities끼리 키를 못 쓰므로 위젯에서 무효화)
                    onDecided={() => void queryClient.invalidateQueries({ queryKey: taskKeys.all })}
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
