"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Schemas } from "@/shared/api";
import { inboxItemHref, notificationHref, useMyInbox, useNotifications } from "@/entities/inbox";
import { useMyQuestions } from "@/entities/question";

interface Toast {
  key: string;
  text: string;
  projectName: string;
  /** 누를 때 정한다 — PM 질문의 룸은 묻는 역할(/me/questions)이 나중에 들어와야 알 수 있다 */
  href: (askerRoleOf: AskerRoleOf) => string;
  /** 같은 일을 가리키는 알림과 처리할 일 — 둘 중 먼저 온 하나만 띄운다 */
  same: string | null;
}

type AskerRoleOf = (questionId: string) => string | undefined;

const TOAST_MS = 6000;

// 처리할 일에는 id가 없다 — 종류와 대상 id로 구분한다
const itemKey = (i: Schemas["InboxItem"]) =>
  `${i.kind}:${i.approvalId ?? i.questionId ?? i.contractId ?? i.planId ?? i.taskId ?? i.agentId ?? i.projectId}`;

/**
 * 알림·처리할 일 목록을 늘 붙잡고 있다가(inbox 신호로 다시 읽힌다) 직전 목록에 없던 것을 토스트로 띄운다.
 * 탭이 가려져 있고 브라우저 알림을 허용했으면 OS 알림도 띄운다. 첫 로드는 기준만 잡는다
 */
export function InboxAlerts() {
  const router = useRouter();
  const notifications = useNotifications().data?.notifications;
  const items = useMyInbox().data?.items;
  // PM 질문은 묻는 쪽 룸으로 보낸다 — 묻는 역할은 /me/questions에서. 누르는 순간의 목록을 쓴다
  const myQuestions = useMyQuestions().data;
  const askerRoleOf = useRef<AskerRoleOf>(() => undefined);
  useEffect(() => {
    askerRoleOf.current = (id) => myQuestions?.find((q) => q.question.id === id)?.question.askerRole;
  }, [myQuestions]);
  const go = (t: Toast) => router.push(t.href(askerRoleOf.current));
  const seen = useRef<Set<string> | null>(null);
  const shown = useRef(new Set<string>());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!notifications || !items) return;
    const all: Toast[] = [
      ...notifications.map((n) => ({
        key: `n:${n.id}`,
        text: n.text,
        projectName: n.projectName,
        href: (a: AskerRoleOf) => notificationHref(n, a),
        same: n.type === "question_asked" ? `ask:${n.questionId}` : null,
      })),
      ...items.map((i) => ({
        key: `i:${itemKey(i)}`,
        text: i.text,
        projectName: i.projectName,
        href: (a: AskerRoleOf) => inboxItemHref(i, a),
        same: i.kind === "question" ? `ask:${i.questionId}` : null,
      })),
    ];
    const prev = seen.current;
    seen.current = new Set(all.map((t) => t.key));
    if (!prev) return;
    // 질문 하나에 알림(물었습니다)과 처리할 일(답할 질문)이 같이 생기고, 두 목록은 따로 다시 읽힌다 — 먼저 온 하나만 띄운다
    const fresh = all.filter((t) => {
      if (prev.has(t.key)) return false;
      if (!t.same) return true;
      if (shown.current.has(t.same)) return false;
      shown.current.add(t.same);
      return true;
    });
    if (fresh.length === 0) return;

    setToasts((ts) => [...ts, ...fresh].slice(-4));
    for (const t of fresh) {
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.key !== t.key)), TOAST_MS);
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const os = new Notification("NOMOS", { body: `${t.text} · ${t.projectName}`, tag: t.key });
        os.onclick = () => {
          window.focus();
          router.push(t.href(askerRoleOf.current));
        };
      }
    }
  }, [notifications, items, router]);

  if (toasts.length === 0) return null;
  return (
    <ol className="fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <li key={t.key} className="card flex items-start gap-2 p-3 shadow-lg">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              setToasts((ts) => ts.filter((x) => x.key !== t.key));
              go(t);
            }}
          >
            <p className="text-[13px] text-ink-900">{t.text}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-500">{t.projectName}</p>
          </button>
          <button
            type="button"
            aria-label="닫기"
            className="text-ink-400 hover:text-ink-700"
            onClick={() => setToasts((ts) => ts.filter((x) => x.key !== t.key))}
          >
            <X size={14} />
          </button>
        </li>
      ))}
    </ol>
  );
}
