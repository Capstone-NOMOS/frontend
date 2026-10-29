"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { FilePlus, FileText, Loader2, Pencil, Search, Terminal, Wrench, type LucideIcon } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { AgentMark, Avatar, Badge, Button, EmptyState } from "@/shared/ui";
import { cn, fmtDate, fmtDateTime, fmtTime, sameDay } from "@/shared/lib/format";
import { ContractCard, useContracts } from "@/entities/contract";
import { useOrgMembers } from "@/entities/org";
import { useProject } from "@/entities/project";
import { QuestionCard, useProjectQuestions } from "@/entities/question";
import {
  ROLE_ROOM,
  ROOM_META,
  RoomParticipants,
  useRoomFeed,
  useRooms,
  useSendRoomMessage,
  type Participant,
} from "@/entities/room";
import { TEAM_ROLE_META } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";
import { Composer } from "./Composer";

type RoomMessage = Schemas["RoomMessage"];
type Question = Schemas["AgentQuestion"];

/**
 * 역할 룸(프로젝트 × 역할). 에이전트·PM은 왼쪽, 사람(질문에 단 답·보낸 메시지)은 오른쪽 대화로 그린다.
 * 에이전트의 말은 말풍선, 도구는 블록, 서버(PM)의 지시·판정은 작은 문장, 질문은 카드다.
 * activity가 없는 줄은 서버가 만든 text를 그대로 찍는다. 팀원은 자기 역할 룸만 본다 (403 ROOM_NOT_VISIBLE)
 */
export function RoleRoomView({ projectId, role }: { projectId: string; role: TeamRole }) {
  // AuthGate·AppShell 안쪽이므로 me와 프로젝트 상세가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const { members } = useProject(projectId).data!;
  const orgMembers = useOrgMembers(me.orgId!).data ?? [];
  const room = useRooms(projectId).data?.find((r) => r.role === role);
  const feed = useRoomFeed(projectId, role);
  const meta = ROOM_META[ROLE_ROOM[role].type];
  const roleMeta = TEAM_ROLE_META[role];
  const questions = useProjectQuestions(projectId, "all").data ?? [];
  // 같은 카드가 묻는 쪽 룸(보기 전용)과 답하는 쪽 룸에 나온다. 답할 수 있는 사람은 그 역할의 담당자와 대표다
  // PM 질문은 대표만 확정한다
  const canAnswer = (q: Question) =>
    q.targetRole === "PM"
      ? isRep
      : q.targetRole === role && (isRep || members.some((m) => m.userId === me.userId && m.teamRole === role));

  const nameOf = (userId: string) => {
    if (userId === me.userId) return "나";
    const m = orgMembers.find((x) => x.userId === userId);
    return m?.nickname ?? m?.name ?? m?.loginId ?? "팀원";
  };
  const agentName = room?.agent?.agentName ?? `${roleMeta.label} 에이전트`;
  const owner = members.find((m) => m.teamRole === role);
  // 이 역할에 붙은 에이전트가 없다(배정 전·연결 해제). 피드 마지막 줄과 상관없이 "생각 중"을 띄우지 않는다
  const noAgent = (room !== undefined && !room.agent) || (owner !== undefined && !owner.agentId);
  const rep = orgMembers.find((m) => m.orgRole === "REPRESENTATIVE");
  const people: Participant[] = [
    { kind: "agent", name: "PM", tone: "pm" },
    ...(room?.agent
      ? [{ kind: "agent" as const, name: agentName, tone: roleMeta.tone, online: room.agent.online }]
      : []),
    ...(owner ? [{ kind: "human" as const, name: nameOf(owner.userId), note: roleMeta.label }] : []),
    ...(rep && rep.userId !== owner?.userId
      ? [{ kind: "human" as const, name: nameOf(rep.userId), note: "대표 · 보기만" }]
      : []),
  ];

  // API는 최신 줄부터 준다 — 대화처럼 오래된 줄이 위로 가게 뒤집는다
  const messages = [...(feed.data ?? [])].reverse();
  const rows = toRows(messages, questions);
  const inline = new Set(rows.flatMap((r) => (r.question ? [r.question.id] : [])));
  // 질문 줄이 아직 불러오지 않은 이전 페이지에 있으면 카드가 피드에 없다 — 답할 질문은 아래에 따로 둔다
  const openElsewhere = questions.filter(
    (q) => q.targetRole === role && (q.status === "pending" || q.status === "agent_answered") && !inline.has(q.id),
  );
  // API 계약은 BE 룸에서 확정한다(문서 탭은 읽기 전용). 확정자는 BE 담당, 없으면 대표 — 판정은 서버(403 NOT_CONTRACT_APPROVER)
  const contracts = useContracts(projectId).data ?? [];
  const openContracts =
    role === "BACKEND" ? contracts.filter((c) => c.status === "draft" || c.status === "failed") : [];
  const canDecideContract = owner ? owner.userId === me.userId : isRep;
  // 에이전트에게 말하기는 그 역할 담당만 — 대표는 FE·BE 룸을 읽기만 한다(명세 F-07. API는 대표도 받지만 화면은 명세를 따른다).
  // 에이전트가 없거나 오프라인이어도 서버가 받아 두었다가 다음 실행에 전달한다
  const canSend = owner?.userId === me.userId;
  const send = useSendRoomMessage(projectId, role);
  const thinkingSec = useThinking(messages);
  const newestId = feed.data?.[0]?.id;
  const scrollRef = useRef<HTMLDivElement>(null);
  // 새 줄이 오면 맨 아래로. 이전 줄을 더 불러올 때는 newestId가 그대로라 움직이지 않는다
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [newestId]);
  // 받은 편지함·토스트에서 #질문id로 들어오면 그 카드로 (피드·질문이 그려진 뒤 한 번만, 맨 아래 스크롤보다 뒤에)
  const hashDone = useRef(false);
  const cardsReady = newestId !== undefined && questions.length > 0;
  useEffect(() => {
    if (!cardsReady || hashDone.current) return;
    const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!el) return;
    hashDone.current = true;
    el.scrollIntoView({ block: "center" });
  }, [cardsReady]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-ink-200 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[16px] font-semibold tracking-tight">{meta.name}</h1>
          <RoomParticipants people={people} />
          {noAgent && <span className="text-[12.5px] text-ink-500">에이전트 연결 필요</span>}
        </div>
        {room && room.activeTasks.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
            {room.activeTasks.map((t) => (
              <li key={t.id}>
                <Link href={`/p/${projectId}/tasks/${t.id}`} className="text-ink-700 hover:underline">
                  <span className="font-mono text-[11px] text-ink-500">{t.state}</span> {t.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-4 sm:px-6">
          {feed.isPending ? (
            <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
              <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : feed.isError ? (
            <EmptyState title={errorMessage(feed.error)} />
          ) : (
            <>
              {feed.hasNextPage && (
                <div className="mb-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feed.isFetchingNextPage}
                    onClick={() => void feed.fetchNextPage()}
                  >
                    {feed.isFetchingNextPage ? "불러오는 중…" : "이전 줄 더 보기"}
                  </Button>
                </div>
              )}
              {rows.length === 0 ? (
                <EmptyState
                  title="아직 기록이 없습니다"
                  desc="프로젝트가 시작되어 태스크가 지시되면 실행 상태와 검증 결과가 여기에 한 줄씩 쌓입니다."
                />
              ) : (
                <ol className="space-y-1">
                  {rows.map(({ message: m, question: q, folded }, i) => {
                    const prev = rows[i - 1];
                    const newDay = !prev || !sameDay(prev.message.ts, m.ts);
                    // 같은 화자가 이어 말하면 마크·이름을 한 번만 그린다. 질문 카드 앞뒤에서는 다시 그린다
                    const head =
                      newDay ||
                      !!q ||
                      !!prev.question ||
                      prev.message.speaker !== m.speaker ||
                      prev.message.userId !== m.userId;
                    const who = m.speaker === "agent" ? agentName : m.speaker === "pm" ? "PM" : "NOMOS";
                    const human = q ? humanAnswer(q) : null;
                    return (
                      <Fragment key={m.id}>
                        {newDay && (
                          <li className="py-2 text-center text-[11.5px] text-ink-400" aria-label="날짜">
                            {fmtDate(m.ts)}
                          </li>
                        )}
                        {m.speaker === "human" ? (
                          <HumanRow
                            mine={m.userId === me.userId}
                            head={head}
                            who={m.userId ? nameOf(m.userId) : "사람"}
                            ts={m.ts}
                          >
                            {m.text}
                          </HumanRow>
                        ) : (
                          <LeftRow head={head} who={who} tone={m.speaker === "agent" ? roleMeta.tone : "pm"} ts={m.ts}>
                            {q ? (
                              <>
                                <QuestionCard
                                  question={q}
                                  canAnswer={canAnswer(q)}
                                  canLabel={isRep}
                                  taskHref={`/p/${projectId}/tasks/${q.taskId}`}
                                  taskTitle={m.taskTitle ?? undefined}
                                />
                                {/* 같은 질문의 뒤 줄(답함·내려놓음 등)은 카드 아래로 접는다 */}
                                <ul className="mt-1 space-y-0.5 pl-1">
                                  {[m, ...folded].map((f) => (
                                    <li key={f.id} className="text-[12px] text-ink-500">
                                      <span className="font-mono tabular-nums text-ink-400">{fmtTime(f.ts)}</span>{" "}
                                      {f.text}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <FeedBody message={m} />
                            )}
                          </LeftRow>
                        )}
                        {q && human !== null && q.answeredBy && (
                          <HumanRow mine={q.answeredBy === me.userId} head who={nameOf(q.answeredBy)} ts={q.answeredAt}>
                            {human}
                          </HumanRow>
                        )}
                      </Fragment>
                    );
                  })}
                  {thinkingSec !== null && !noAgent && (
                    <LeftRow head who={agentName} tone={roleMeta.tone}>
                      <span
                        className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-ink-100 px-3 py-1.5 text-[13px] text-ink-500"
                        aria-live="polite"
                      >
                        <span className="inline-flex gap-1" aria-hidden>
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot" />
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:300ms]" />
                        </span>
                        생각 중 · <span className="tabular-nums">{fmtElapsed(thinkingSec)}</span>
                      </span>
                    </LeftRow>
                  )}
                </ol>
              )}
            </>
          )}

          {openContracts.length > 0 && (
            <section className="mt-6 space-y-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                확정할 API 계약 · {openContracts.length}
              </h2>
              {openContracts.map((c) => (
                <ContractCard key={c.id} projectId={projectId} contract={c} canDecide={canDecideContract} />
              ))}
            </section>
          )}

          {openElsewhere.length > 0 && (
            <section className="mt-6 space-y-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                {roleMeta.label}가 답할 질문 · {openElsewhere.length}
              </h2>
              {openElsewhere.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  canAnswer={canAnswer(q)}
                  canLabel={isRep}
                  taskHref={`/p/${projectId}/tasks/${q.taskId}`}
                />
              ))}
            </section>
          )}
        </div>
      </div>

      {canSend && (
        <div className="shrink-0 border-t border-ink-100 bg-white safe-bottom">
          <div className="mx-auto max-w-[860px] px-3 py-3 sm:px-6">
            <Composer
              disabled={send.isPending}
              maxLength={1000}
              placeholder={`${agentName}에게 메시지`}
              onSend={(text) => send.mutateAsync(text)}
            />
            <p className="mt-1.5 px-1 text-[11.5px] text-ink-500">
              {send.isError ? (
                <span className="text-forbidden">{errorMessage(send.error)}</span>
              ) : (
                "다음 실행에 전달됩니다 — 지금 실행 중인 작업에 바로 반영하려면 태스크를 멈추고 재개하세요. 비밀값은 적지 마세요(기록에 남습니다)."
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** 사람 메시지. 내가 쓴 것만 오른쪽, 다른 사람(담당·대표)은 왼쪽에 이름과 함께 */
function HumanRow({
  mine,
  head,
  who,
  ts,
  children,
}: {
  mine: boolean;
  head: boolean;
  who: string;
  ts: string | null;
  children: ReactNode;
}) {
  if (mine) {
    return (
      <RightRow who={who} ts={ts}>
        {children}
      </RightRow>
    );
  }
  return (
    <LeftRow head={head} who={who} person ts={ts ?? undefined}>
      <div className="inline-block whitespace-pre-wrap rounded-2xl rounded-tl-md bg-ink-100 px-4 py-2.5 text-[14px] leading-6 text-ink-900">
        {children}
      </div>
    </LeftRow>
  );
}

/** 에이전트·PM·NOMOS·다른 사람 쪽(왼쪽). head면 마크와 이름·시각을 그린다. person이면 마크 대신 이니셜 */
function LeftRow({
  head,
  who,
  tone = "pm",
  person = false,
  ts,
  children,
}: {
  head: boolean;
  who: string;
  tone?: "fe" | "be" | "pm";
  person?: boolean;
  ts?: string;
  children: ReactNode;
}) {
  return (
    <li className={cn("flex gap-2.5 animate-rise", head && "pt-2")}>
      <span className="w-7 shrink-0">
        {head && (person ? <Avatar name={who} size={28} /> : <AgentMark tone={tone} size={28} />)}
      </span>
      <div className="min-w-0 flex-1">
        {head && (
          <div className="mb-0.5 flex items-baseline gap-1.5 text-[12px]">
            <span className="font-semibold text-ink-700">{who}</span>
            {ts && (
              <span className="font-mono tabular-nums text-ink-400" title={fmtDateTime(ts)}>
                {fmtTime(ts)}
              </span>
            )}
          </div>
        )}
        <div className="max-w-[640px]">{children}</div>
      </div>
    </li>
  );
}

/** 내 쪽(오른쪽). 내가 질문에 단 답과 내가 보낸 메시지 */
function RightRow({ who, ts, children }: { who: string; ts: string | null; children: ReactNode }) {
  return (
    <li className="flex justify-end pt-2 animate-rise">
      <div className="max-w-[80%]">
        <div className="mb-0.5 flex items-baseline justify-end gap-1.5 text-[12px]">
          {ts && (
            <span className="font-mono tabular-nums text-ink-400" title={fmtDateTime(ts)}>
              {fmtTime(ts)}
            </span>
          )}
          <span className="font-semibold text-ink-700">{who}</span>
        </div>
        <div className="whitespace-pre-wrap rounded-2xl rounded-tr-md bg-ink-900 px-4 py-2.5 text-[14px] leading-6 text-white">
          {children}
        </div>
      </div>
    </li>
  );
}

/** 사람이 답했으면(직접·확인·뒤집기) 답 문장. 질문이 여럿이면 "질문 → 답" 줄로. 에이전트 답이면 null */
function humanAnswer(q: Question): string | null {
  if (q.status !== "answered" || !q.answers || !q.answerSource || q.answerSource === "agent") return null;
  const answers = q.answers;
  const entries = q.questions.map((x) => [x.question, answers[x.question] ?? ""] as const);
  return entries.length === 1 ? entries[0][1] : entries.map(([k, v]) => `${k}\n→ ${v}`).join("\n\n");
}

const fmtElapsed = (sec: number) => (sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`);

type Activity = NonNullable<RoomMessage["activity"]>;

const TOOL_ICON: Record<Exclude<Activity["kind"], "say">, LucideIcon> = {
  read: FileText,
  edit: Pencil,
  write: FilePlus,
  run: Terminal,
  search: Search,
  other: Wrench,
};

/** 줄 내용. 에이전트의 말은 말풍선, 도구는 아이콘 + 대상(고정폭), PM·NOMOS는 작고 흐린 문장 */
function FeedBody({ message: m }: { message: RoomMessage }) {
  const a = m.activity;
  if (m.speaker !== "agent") {
    return <p className="whitespace-pre-wrap break-words text-[12.5px] leading-6 text-ink-500">{m.text}</p>;
  }
  if (a?.kind === "say") {
    return (
      <p className="inline-block whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-ink-100 px-3.5 py-2 text-[14px] leading-6 text-ink-900">
        {a.target}
      </p>
    );
  }
  if (a) return <ToolBlock activity={a} />;
  // 활동 필드가 없는 에이전트 줄(인계 노트 등) — 서버 문장 그대로
  return <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-ink-900">{m.text}</p>;
}

function ToolBlock({ activity: a }: { activity: Activity }) {
  const Icon = TOOL_ICON[a.kind as Exclude<Activity["kind"], "say">];
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1">
      <Icon size={13} className="shrink-0 text-ink-500" aria-label={a.kind} />
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-800" title={a.target}>
        {a.target}
      </code>
      {(a.added !== null || a.removed !== null) && (
        <span className="shrink-0 font-mono text-[11.5px] tabular-nums">
          {a.added !== null && <span className="text-auto">+{a.added}</span>}
          {a.added !== null && a.removed !== null && " "}
          {a.removed !== null && <span className="text-forbidden">−{a.removed}</span>}
        </span>
      )}
      {a.ok === false && <Badge tone="danger">실패</Badge>}
    </div>
  );
}

type Row = { message: RoomMessage; question?: Question; folded: RoomMessage[] };

/** 같은 questionId 줄은 처음 줄 자리의 카드 하나로 묶는다. 질문 내용을 아직 못 읽었으면 그냥 줄로 둔다 */
function toRows(messages: RoomMessage[], questions: Question[]): Row[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const cards = new Map<string, Row>();
  const rows: Row[] = [];
  for (const m of messages) {
    const q = m.questionId ? byId.get(m.questionId) : undefined;
    const card = q && cards.get(q.id);
    if (card) {
      card.folded.push(m);
      continue;
    }
    const row: Row = { message: m, question: q, folded: [] };
    if (q) cards.set(q.id, row);
    rows.push(row);
  }
  return rows;
}

const IDLE_MS = 6000;

/**
 * 실행 중(AGENT_RUN_STARTED 뒤 ENDED 없음)인 태스크가 있고 몇 초간 새 줄이 없으면 마지막 줄 뒤로 지난 초, 아니면 null.
 * 서버 데이터는 없다 — 화면이 매초 센다
 */
function useThinking(messages: RoomMessage[]): number | null {
  const running = new Set<string>();
  for (const m of messages) {
    if (!m.taskId) continue;
    if (m.type === "AGENT_RUN_STARTED") running.add(m.taskId);
    else if (m.type === "AGENT_RUN_ENDED") running.delete(m.taskId);
  }
  const last = messages.at(-1)?.ts;
  const active = running.size > 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!active || last === undefined) return null;
  const idle = now - new Date(last).getTime();
  return idle > IDLE_MS ? Math.floor(idle / 1000) : null;
}
