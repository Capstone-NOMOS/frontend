"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Bell, CircleHelp, ClipboardCheck, Link2, Sparkles } from "lucide-react";
import { Badge, EmptyState, SectionTitle } from "@/shared/ui";
import { cn, fmtTime, relTime } from "@/shared/lib/format";
import type { Message } from "@/entities/message";
import { ROOM_META, type Room } from "@/entities/room";
import { useApp, useProject } from "@/lib/store";

type InboxItem = { m: Message; room: Room; icon: React.ReactNode; title: string; desc: string; tag: string; tone: "brand" | "warn" | "neutral" };

export function InboxView({ projectId }: { projectId: string }) {
  const { state, me } = useApp();
  const { myRole, visibleRooms, canWrite, events } = useProject(projectId);

  const items = useMemo(() => {
    const roomIds = new Set(visibleRooms.map((r) => r.id));
    return state.messages
      .filter((m) => roomIds.has(m.roomId) && m.card)
      .flatMap((m): InboxItem[] => {
        const c = m.card!;
        const room = visibleRooms.find((r) => r.id === m.roomId)!;
        const writable = canWrite(room);
        if (c.kind === "spec" && c.status === "pending" && myRole === "OWNER") return [{ m, room, icon: <Sparkles size={16} />, title: `명세 v${c.version} 승인 대기`, desc: c.title, tag: "승인", tone: "brand" }];
        if (c.kind === "report" && c.status === "pending" && myRole === "OWNER") return [{ m, room, icon: <ClipboardCheck size={16} />, title: "완료 보고서 확인", desc: c.title, tag: "승인", tone: "brand" }];
        if (c.kind === "question" && !c.answer && writable) return [{ m, room, icon: <CircleHelp size={16} />, title: `${c.taskId} · 에이전트가 결정을 기다립니다`, desc: c.question, tag: "결정", tone: "warn" }];
        if (c.kind === "repo" && c.status === "pending" && writable) return [{ m, room, icon: <Link2 size={16} />, title: `${c.role} 레포 연결`, desc: "레포 URL과 로컬 경로를 등록해주세요", tag: "설정", tone: "neutral" }];
        return [];
      })
      .sort((a, b) => (a.m.ts < b.m.ts ? 1 : -1));
  }, [state.messages, visibleRooms, myRole, canWrite]);

  const notices = useMemo(() => events.filter((e) => e.tone && e.tone !== "default").sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 12), [events]);

  if (!me) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">받은 편지함</h1>
        <p className="mt-1 text-[14px] text-ink-500">{me.nickname} 님의 결정이 필요한 항목과 알림입니다.</p>

        <section className="mt-6">
          <SectionTitle>내 결정 필요 · {items.length}</SectionTitle>
          {items.length === 0 ? (
            <EmptyState title="처리할 항목이 없습니다" desc="승인 카드나 에이전트 질의가 오면 여기에 모입니다." />
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.m.id}>
                  <Link href={`/p/${projectId}/rooms/${it.room.id}#${it.m.id}`} className="card flex items-center gap-3 px-4 py-3 transition hover:border-ink-300">
                    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", it.tone === "warn" ? "bg-human-bg text-human" : it.tone === "brand" ? "bg-brand-50 text-brand-600" : "bg-ink-100 text-ink-600")}>{it.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold">{it.title}</span>
                        <Badge tone={it.tone}>{it.tag}</Badge>
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-500">{it.desc}</span>
                    </span>
                    <span className="hidden text-right text-[11.5px] text-ink-500 sm:block">
                      <span className="block">{ROOM_META[it.room.type].name}</span>
                      <span>{relTime(it.m.ts)}</span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-ink-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <SectionTitle>알림</SectionTitle>
          <ul className="card divide-y divide-ink-100">
            {notices.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3 text-[13px]">
                <Bell size={14} className={cn("mt-0.5 shrink-0", e.tone === "danger" ? "text-forbidden" : e.tone === "warn" ? "text-human" : "text-auto")} />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{e.actor}</span> <span className="text-ink-600">{e.summary}</span>
                </span>
                <span className="shrink-0 font-mono text-[11.5px] text-ink-400">{fmtTime(e.ts)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
