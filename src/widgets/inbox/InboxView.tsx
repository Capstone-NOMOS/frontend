"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, EmptyState, SectionTitle } from "@/shared/ui";
import { cn, fmtDateTime, fmtTime, relTime } from "@/shared/lib/format";
import {
  INBOX_KIND_LABEL,
  inboxItemHref,
  notificationHref,
  useMarkNotificationsRead,
  useMyInbox,
  useNotifications,
} from "@/entities/inbox";
import { useProject } from "@/entities/project";
import { QuestionCard, useProjectQuestions } from "@/entities/question";
import { useTasks } from "@/entities/task";
import { displayName, useCurrentUser } from "@/entities/user";

/**
 * 처리할 일(조직 전체, 처리하면 빠진다) · 이 프로젝트의 에이전트 질문 · 알림(일어난 일, 읽음).
 * 승인 카드는 그 역할 룸(G3는 대표 룸)에 뜬다 — 처리할 일에서 누르면 그 카드로 간다. 처리할 일·알림의 문장은 서버가 만든다
 */
export function InboxView({ projectId }: { projectId: string }) {
  // AuthGate·AppShell 안쪽이므로 me가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const inbox = useMyInbox();
  const notifications = useNotifications();
  const pending = useProjectQuestions(projectId, "pending");
  const agentAnswered = useProjectQuestions(projectId, "agent_answered");
  // 답할 수 있는 사람: 답할 역할의 담당자와 대표 (최종 판정은 403 NOT_QUESTION_TARGET)
  const myTeamRole = useProject(projectId).data?.members.find((m) => m.userId === me.userId)?.teamRole;
  const questions = [...(pending.data ?? []), ...(agentAnswered.data ?? [])];
  const tasks = useTasks(projectId).data;
  useMarkReadOnOpen(notifications.data);
  useScrollToHash(pending.isSuccess);

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
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
                // 배포본의 알림 줄(EventRow)과 같은 모양: 시각 · 색 점 · 문장 · 상대 시간
                <li key={n.id}>
                  <Link href={notificationHref(n)} className="flex items-start gap-3 py-2 text-[13px] hover:bg-ink-50">
                    <span
                      className="w-11 shrink-0 pt-0.5 font-mono text-[11.5px] text-ink-400 tabular-nums"
                      title={fmtDateTime(n.ts)}
                    >
                      {fmtTime(n.ts)}
                    </span>
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", NOTIFICATION_DOT[n.type])} />
                    <span className={cn("min-w-0 flex-1", n.read ? "text-ink-600" : "font-medium text-ink-900")}>
                      {n.text}
                      {n.projectId !== projectId && <span className="text-ink-400"> · {n.projectName}</span>}
                    </span>
                    <span className="hidden shrink-0 text-[11.5px] text-ink-400 sm:inline">{relTime(n.ts)}</span>
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

// EventRow의 점 색과 같은 토큰: 완료 = 성공, 물음 = 사람 차례, 답함 = 기본
const NOTIFICATION_DOT: Record<Schemas["Notification"]["type"], string> = {
  task_done: "bg-auto",
  question_asked: "bg-human",
  question_answered: "bg-ink-300",
};

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
