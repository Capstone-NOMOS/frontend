"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Info, Link2, X } from "lucide-react";
import { AgentMark, Avatar, Badge, Button, EmptyState } from "@/shared/ui";
import { cn, fmtDate, fmtTime, sameDay } from "@/shared/lib/format";
import { AGENT_STATUS, StatusDot } from "@/entities/agent";
import type { Message } from "@/entities/message";
import { ROOM_META, type Room } from "@/entities/room";
import { TaskBadge } from "@/entities/task";
import { RoleBadge } from "@/entities/user";
import { useApp, useProject } from "@/lib/store";
import { Composer } from "./Composer";
import { DispatchCard, LogCard, Notice, PolicyCard, QuestionCard, RepoCard, ReportCard, SpecCard, VerificationCard } from "./Cards";

export function RoomView({ projectId, roomId }: { projectId: string; roomId: string }) {
  const { state, me, actions } = useApp();
  const { project, myRole, canWrite, agentFor, userFor, tasks, repos, rooms } = useProject(projectId);
  const room = rooms.find((r) => r.id === roomId);
  const [panel, setPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => state.messages.filter((m) => m.roomId === roomId), [state.messages, roomId]);
  const typing = state.pmTyping[roomId];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ block: "center" });
      el.classList.add("ring-2", "ring-brand-200", "rounded-xl");
      setTimeout(() => el.classList.remove("ring-2", "ring-brand-200", "rounded-xl"), 2200);
    }
  }, [roomId]);

  if (!project || !room || !me) return null;

  const visible = myRole === "OWNER" || room.type === myRole;
  if (!visible) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState title="403 · 이 Room에 접근할 수 없습니다" desc={`${ROOM_META[room.type].name}은 ${ROOM_META[room.type].who}의 공간입니다. FE·BE는 자기 Room만 볼 수 있습니다.`} action={<Button href={`/p/${projectId}`} variant="outline">대시보드로</Button>} />
      </div>
    );
  }

  const writable = canWrite(room);
  const meta = ROOM_META[room.type];
  const roleAgent = room.type === "OWNER" ? null : agentFor(room.type);
  const roleUser = userFor(room.type === "OWNER" ? "OWNER" : room.type);
  const roomTasks = tasks.filter((t) => room.type !== "OWNER" && t.role === room.type);
  const repo = room.type === "OWNER" ? null : repos.find((r) => r.ownerRole === room.type);
  const mention = room.type === "OWNER" ? "PM" : `${room.type} 에이전트`;
  const placeholder = room.type === "OWNER" ? "요구사항을 한 문장으로 적어주세요. PM이 명세로 정리합니다" : `${room.type} 에이전트에게 말하거나, 질문에 답해주세요`;

  const statusChip = () => {
    if (room.type === "OWNER") {
      const pending = messages.some((m) => (m.card?.kind === "spec" || m.card?.kind === "report") && m.card.status === "pending");
      return pending ? <Badge tone="warn">승인 대기</Badge> : <Badge tone="pm">PM 대기 중</Badge>;
    }
    const waiting = roomTasks.find((t) => t.state === "WAITING_HUMAN");
    if (waiting) return <Badge tone="warn">{waiting.id} 결정 대기</Badge>;
    const working = roomTasks.find((t) => t.state === "IN_PROGRESS");
    if (working && roleAgent) return <Badge tone="info">에이전트 작업 중 · {working.id}</Badge>;
    if (roleAgent) return <Badge tone={roleAgent.status === "offline" ? "danger" : "success"}>에이전트 {AGENT_STATUS[roleAgent.status].label}</Badge>;
    return <Badge>에이전트 미연결</Badge>;
  };

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold">{meta.name}</h1>
              {!writable && (
                <span className="hidden items-center gap-1 rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500 sm:inline-flex">
                  <Eye size={11} /> 읽기 전용
                </span>
              )}
            </div>
            <div className="truncate text-[12px] text-ink-500">{meta.who}</div>
          </div>
          <div className="hidden sm:block">{statusChip()}</div>
          <div className="hidden items-center -space-x-1.5 md:flex">
            {roleUser && <Avatar name={roleUser.nickname} size={26} className="ring-2 ring-white" />}
            {room.type !== "OWNER" && <AgentMark tone={room.type === "FE" ? "fe" : "be"} size={26} className="ring-2 ring-white" />}
            <AgentMark tone="pm" size={26} className="ring-2 ring-white" />
          </div>
          <button onClick={() => setPanel((v) => !v)} className={cn("rounded-lg p-2 text-ink-500 hover:bg-ink-100", panel && "bg-ink-100 text-ink-900")} aria-label="Room 정보">
            <Info size={18} />
          </button>
        </header>

        {!writable && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-human-bg px-4 py-2 text-[12.5px] text-human sm:px-6">
            <Eye size={14} /> 대표는 이 Room을 읽을 수만 있습니다. {meta.who}이 대화하는 공간이며, 대표의 요청은 Room 3에서 PM을 통해 전달됩니다.
          </div>
        )}

        {/* messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[780px] flex-col gap-1 px-4 pb-6 pt-4 sm:px-6">
            {messages.length === 0 && <EmptyState title="아직 메시지가 없습니다" desc={room.type === "OWNER" ? "첫 요구사항을 적으면 PM이 명세를 정리합니다." : "대표가 명세를 승인하면 태스크가 도착합니다."} />}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDay = !prev || !sameDay(prev.ts, m.ts);
              const grouped = prev && !showDay && prev.authorType === m.authorType && prev.authorId === m.authorId && m.authorType !== "system" && new Date(m.ts).getTime() - new Date(prev.ts).getTime() < 5 * 60 * 1000 && !prev.card;
              return (
                <div key={m.id} id={m.id} className="animate-rise">
                  {showDay && <DayDivider ts={m.ts} />}
                  <MessageRow m={m} meId={me.id} room={room} grouped={Boolean(grouped)} projectId={projectId} writable={writable} isOwner={myRole === "OWNER"} />
                </div>
              );
            })}
            {typing && (
              <div className="mt-2 flex items-center gap-2.5">
                <AgentMark tone="pm" size={28} />
                <span className="inline-flex items-center gap-1 rounded-2xl bg-ink-100 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:300ms]" />
                </span>
                <span className="text-[12px] text-ink-500">PM이 명세를 정리하는 중</span>
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="shrink-0 border-t border-ink-100 bg-white/90 backdrop-blur safe-bottom">
          <div className="mx-auto max-w-[780px] px-3 py-3 sm:px-6">
            {writable ? (
              <Composer placeholder={placeholder} mention={mention} onSend={(t) => actions.sendMessage(roomId, t)} />
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-200 px-4 py-3 text-center text-[13px] text-ink-500">
                읽기 전용 — 요청은 <Link href={`/p/${projectId}/rooms/${rooms.find((r) => r.type === "OWNER")?.id}`} className="font-medium text-brand-600 hover:underline">Room 3</Link>에서 PM에게 전달하세요
              </div>
            )}
          </div>
        </div>
      </div>

      {/* right panel */}
      {panel && (
        <>
          <button className="fixed inset-0 z-30 bg-ink-900/20 xl:hidden" onClick={() => setPanel(false)} aria-label="닫기" />
          <aside className="fixed inset-y-0 right-0 z-40 w-[min(340px,90vw)] overflow-y-auto border-l border-ink-200 bg-white p-5 shadow-pop xl:static xl:z-auto xl:w-[320px] xl:shadow-none animate-rise">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">Room 정보</h2>
              <button onClick={() => setPanel(false)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 xl:hidden" aria-label="닫기">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-2 text-[12px] font-semibold text-ink-700">멤버</div>
                <ul className="space-y-2">
                  {roleUser && (
                    <li className="flex items-center gap-2.5">
                      <Avatar name={roleUser.nickname} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{roleUser.nickname}</span>
                        <span className="block text-[11.5px] text-ink-500">@{roleUser.username}</span>
                      </span>
                      <RoleBadge role={room.type} />
                    </li>
                  )}
                  {roleAgent && (
                    <li className="flex items-center gap-2.5">
                      <AgentMark tone={room.type === "FE" ? "fe" : "be"} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{roleAgent.label}</span>
                        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-500"><StatusDot status={roleAgent.status} pulse /> {AGENT_STATUS[roleAgent.status].label} · 로컬 브릿지</span>
                      </span>
                    </li>
                  )}
                  <li className="flex items-center gap-2.5">
                    <AgentMark tone="pm" size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">PM</span>
                      <span className="block text-[11.5px] text-ink-500">NOMOS 서버 · 세 Room 공용</span>
                    </span>
                  </li>
                </ul>
              </div>

              {room.type !== "OWNER" && (
                <div>
                  <div className="mb-2 text-[12px] font-semibold text-ink-700">이 방의 태스크</div>
                  {roomTasks.length === 0 ? (
                    <p className="text-[12.5px] text-ink-500">아직 배정된 태스크가 없습니다.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {roomTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-2 text-[12.5px]">
                          <span className="font-mono text-ink-500">{t.id}</span>
                          <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          <TaskBadge state={t.state} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {room.type !== "OWNER" && (
                <div>
                  <div className="mb-2 text-[12px] font-semibold text-ink-700">레포</div>
                  {repo ? (
                    <div className="rounded-lg border border-ink-200 px-3 py-2 text-[12.5px]">
                      <div className="flex items-center gap-1.5 font-medium"><Link2 size={12} /> {repo.url.replace("https://github.com/", "")}</div>
                      <div className="mt-0.5 font-mono text-[11.5px] text-ink-500">{`${repo.localPath}/**`}</div>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-ink-500">아직 연결되지 않았습니다.</p>
                  )}
                </div>
              )}

              <div>
                <div className="mb-2 text-[12px] font-semibold text-ink-700">이 방의 규칙</div>
                <ul className="space-y-1 text-[12.5px] text-ink-600">
                  {room.type === "OWNER" ? (
                    <>
                      <li>· 요구사항 → PM 명세 → 대표 승인 → 분배</li>
                      <li>· 승인 전에는 어떤 태스크도 전달되지 않음</li>
                      <li>· 수정 요청은 최대 3회</li>
                    </>
                  ) : (
                    <>
                      <li>· FE·BE 에이전트는 서로 직접 대화하지 않음 (PM 경유)</li>
                      <li>· 에이전트는 모르는 결정을 담당자에게 물어봄 → ADR 저장</li>
                      <li>· 스코프 밖 수정은 항상 FORBIDDEN</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function DayDivider({ ts }: { ts: string }) {
  return (
    <div className="my-4 flex items-center gap-3 text-[11.5px] text-ink-400">
      <div className="h-px flex-1 bg-ink-100" />
      <span>{fmtDate(ts)}</span>
      <div className="h-px flex-1 bg-ink-100" />
    </div>
  );
}

function MessageRow({ m, meId, room, grouped, projectId, writable, isOwner }: { m: Message; meId: string; room: Room; grouped: boolean; projectId: string; writable: boolean; isOwner: boolean }) {
  const { state } = useApp();
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const time = <span className="text-[11px] text-ink-400 tabular-nums">{fmtTime(m.ts)}</span>;

  const renderCard = () => {
    const c = m.card;
    if (!c) return null;
    switch (c.kind) {
      case "spec":
        return <SpecCard message={m} card={c} canDecide={isOwner && writable} projectId={projectId} />;
      case "dispatch":
        return <DispatchCard card={c} tasks={tasks} projectId={projectId} />;
      case "log":
        return <LogCard card={c} />;
      case "question":
        return <QuestionCard message={m} card={c} canAnswer={writable} answeredByName={state.users.find((u) => u.id === c.answeredBy)?.nickname} />;
      case "verification":
        return <VerificationCard card={c} />;
      case "report":
        return <ReportCard message={m} card={c} canDecide={isOwner && writable} />;
      case "policy":
        return <PolicyCard card={c} />;
      case "repo":
        return <RepoCard card={c} canEdit={writable} projectId={projectId} />;
      case "notice":
        return <Notice card={c} />;
    }
  };

  if (m.authorType === "system") {
    const c = m.card;
    const centered = c?.kind === "notice";
    return <div className={cn("py-1", centered ? "flex justify-center text-center" : "pl-0 sm:pl-10")}>{renderCard()}</div>;
  }

  if (m.authorType === "user") {
    const user = state.users.find((u) => u.id === m.authorId);
    const mine = m.authorId === meId;
    if (mine) {
      return (
        <div className={cn("flex flex-col items-end", grouped ? "mt-0.5" : "mt-3")}>
          <div className="flex max-w-[85%] items-end gap-2">
            {time}
            <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink-100 px-4 py-2.5 text-[14.5px] leading-6 text-ink-900">{m.text}</div>
          </div>
          {m.card && <div className="w-full max-w-[85%]">{renderCard()}</div>}
        </div>
      );
    }
    return (
      <div className={cn("flex gap-2.5", grouped ? "mt-0.5" : "mt-3")}>
        <div className="w-8 shrink-0">{!grouped && user && <Avatar name={user.nickname} size={30} />}</div>
        <div className="min-w-0 flex-1">
          {!grouped && (
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-[13px] font-semibold">{user?.nickname}</span>
              {time}
            </div>
          )}
          <div className="inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-ink-200 bg-white px-4 py-2.5 text-[14.5px] leading-6">{m.text}</div>
          {renderCard()}
        </div>
      </div>
    );
  }

  // agent / pm
  const isPm = m.authorType === "pm";
  const agent = !isPm ? state.agents.find((a) => a.id === m.authorId) : undefined;
  const tone = isPm ? "pm" : room.type === "FE" ? "fe" : "be";
  const owner = agent ? state.users.find((u) => u.id === agent.userId) : undefined;
  return (
    <div className={cn("flex gap-2.5", grouped ? "mt-0.5" : "mt-4")}>
      <div className="w-8 shrink-0">{!grouped && <AgentMark tone={tone} size={30} />}</div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[13px] font-semibold">{isPm ? "PM" : `${room.type} 에이전트`}</span>
            <span className="text-[11.5px] text-ink-500">{isPm ? "NOMOS 서버 · 프로젝트 문서 공유" : `${agent?.label ?? ""}${owner ? ` · managed by ${owner.nickname}` : ""}`}</span>
            {time}
          </div>
        )}
        {m.text && <div className="max-w-[700px] whitespace-pre-wrap text-[14.5px] leading-7 text-ink-900">{m.text}</div>}
        {renderCard()}
      </div>
    </div>
  );
}
