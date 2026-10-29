"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, EmptyState, SectionTitle } from "@/shared/ui";
import { cn, relTime } from "@/shared/lib/format";
import { ApprovalCard, canDecideApproval, useProjectApprovals } from "@/entities/approval";
import {
  INBOX_KIND_LABEL,
  inboxItemHref,
  notificationHref,
  useMarkNotificationsRead,
  useMyInbox,
  useNotifications,
} from "@/entities/inbox";
import { projectKeys, useProject } from "@/entities/project";
import { QuestionCard, useProjectQuestions } from "@/entities/question";
import { taskKeys, useTasks } from "@/entities/task";
import { displayName, useCurrentUser } from "@/entities/user";

/**
 * 처리할 일(조직 전체, 처리하면 빠진다) · 이 프로젝트의 승인·질문 카드(실제로 처리하는 곳) · 알림(일어난 일, 읽음).
 * 처리할 일·알림의 문장은 서버가 만든다
 */
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
  const inbox = useMyInbox();
  const notifications = useNotifications();
  const pending = useProjectQuestions(projectId, "pending");
  const agentAnswered = useProjectQuestions(projectId, "agent_answered");
  // 답할 수 있는 사람: 답할 역할의 담당자와 대표 (최종 판정은 403 NOT_QUESTION_TARGET)
  const myTeamRole = useProject(projectId).data?.members.find((m) => m.userId === me.userId)?.teamRole;
  const questions = [...(pending.data ?? []), ...(agentAnswered.data ?? [])];
  const tasks = useTasks(projectId).data;
  useMarkReadOnOpen(notifications.data);
  useScrollToHash(approvals.isSuccess && pending.isSuccess);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">받은 편지함</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="flex-1 text-[14px] text-ink-500">
            {displayName(me)} 님{isRep ? "의 결정이 필요한 항목" : "이 확인할 항목"}과 알림입니다.
          </p>
          <BrowserNotificationButton />
        </div>

        <section className="mt-6">
          <SectionTitle>처리할 일 · {inbox.data?.items.length ?? 0}</SectionTitle>
          {inbox.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : inbox.isError ? (
            <EmptyState title={errorMessage(inbox.error)} />
          ) : inbox.data.items.length === 0 ? (
            <EmptyState
              title="지금 손댈 일이 없습니다"
              desc="승인·질문·계약·계획처럼 내 차례인 일이 생기면 여기에 모입니다."
            />
          ) : (
            <ul className="card divide-y divide-ink-100 px-4">
              {inbox.data.items.map((i) => (
                <li
                  key={`${i.kind}:${i.approvalId ?? i.questionId ?? i.contractId ?? i.planId ?? i.taskId ?? i.agentId}`}
                >
                  <Link
                    href={inboxItemHref(i)}
                    className="flex items-center gap-2 py-2.5 text-[13px] hover:text-ink-900"
                  >
                    <Badge tone={i.kind === "stuck_task" || i.kind === "agent_needed" ? "warn" : "info"}>
                      {INBOX_KIND_LABEL[i.kind]}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-ink-700">{i.text}</span>
                    {i.projectId !== projectId && <span className="text-[11.5px] text-ink-500">{i.projectName}</span>}
                    <span className="text-[11.5px] text-ink-500">{relTime(i.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
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
          {notifications.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : notifications.isError ? (
            <EmptyState title={errorMessage(notifications.error)} />
          ) : (
            <ul className="card divide-y divide-ink-100 px-4">
              {notifications.data.notifications.map((n) => (
                <li key={n.id}>
                  <Link href={notificationHref(n)} className="flex items-center gap-2 py-2.5 text-[13px]">
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-600")}
                      aria-label={n.read ? undefined : "안 읽음"}
                    />
                    <span
                      className={cn("min-w-0 flex-1 truncate", n.read ? "text-ink-500" : "font-medium text-ink-900")}
                    >
                      {n.text}
                    </span>
                    {n.projectId !== projectId && <span className="text-[11.5px] text-ink-500">{n.projectName}</span>}
                    <span className="text-[11.5px] text-ink-500">{relTime(n.ts)}</span>
                  </Link>
                </li>
              ))}
              {notifications.data.notifications.length === 0 && (
                <li className="py-6 text-center text-[13px] text-ink-500">최근 30일 동안 알림이 없습니다</li>
              )}
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

/** 편지함을 열면 맨 위 알림까지 읽음. 같은 id로는 한 번만 부른다 */
function useMarkReadOnOpen(data: { notifications: Schemas["Notification"][]; unreadCount: number } | undefined) {
  const markRead = useMarkNotificationsRead();
  const sent = useRef<string | null>(null);
  const topId = data?.notifications[0]?.id;
  const unread = (data?.unreadCount ?? 0) > 0;
  useEffect(() => {
    if (!topId || !unread || sent.current === topId) return;
    sent.current = topId;
    markRead.mutate(topId);
  }, [topId, unread, markRead]);
}

/** 다른 화면에서 #카드id로 들어오면 카드가 데이터 뒤에 그려진다 — 준비되면 한 번 스크롤한다 */
function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [ready]);
}

/** 탭이 가려져 있을 때 OS 알림을 띄우려면 한 번 허용이 필요하다. 묻지 않은 상태에서만 보인다 */
function BrowserNotificationButton() {
  // AuthGate 안쪽이라 서버에서는 그려지지 않는다 — 처음부터 window를 읽어도 된다
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );
  if (permission !== "default") return null;
  return (
    <Button variant="outline" size="sm" onClick={() => void Notification.requestPermission().then(setPermission)}>
      <Bell size={14} /> 브라우저 알림 켜기
    </Button>
  );
}
