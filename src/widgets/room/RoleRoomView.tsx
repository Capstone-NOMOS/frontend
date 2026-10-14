"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { FilePlus, FileText, Loader2, Pencil, Search, Terminal, Wrench, type LucideIcon } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Badge, Button, EmptyState } from "@/shared/ui";
import { fmtDate, fmtDateTime, fmtTime, sameDay } from "@/shared/lib/format";
import { StatusDot } from "@/entities/agent";
import { useProject } from "@/entities/project";
import { QuestionCard, useProjectQuestions } from "@/entities/question";
import { ROLE_ROOM, ROOM_META, useRoomFeed, useRooms } from "@/entities/room";
import { TEAM_ROLE_META } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

type RoomMessage = Schemas["RoomMessage"];
type Question = Schemas["AgentQuestion"];

/**
 * 역할 룸(프로젝트 × 역할). Claude Code 확장처럼 에이전트의 말·도구 블록, 서버(PM)의 지시·판정, 질문 카드를 보여 준다.
 * activity가 없는 줄은 서버가 만든 text를 그대로 찍는다. 팀원은 자기 역할 룸만 본다 (403 ROOM_NOT_VISIBLE)
 */
export function RoleRoomView({ projectId, role }: { projectId: string; role: TeamRole }) {
  // AuthGate·AppShell 안쪽이므로 me와 프로젝트 상세가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const { members } = useProject(projectId).data!;
  const room = useRooms(projectId).data?.find((r) => r.role === role);
  const feed = useRoomFeed(projectId, role);
  const meta = ROOM_META[ROLE_ROOM[role].type];
  const questions = useProjectQuestions(projectId, "all").data ?? [];
  // 같은 카드가 묻는 쪽 룸(보기 전용)과 답하는 쪽 룸에 나온다. 답할 수 있는 사람은 그 역할의 담당자와 대표다
  const canAnswer = (q: Question) =>
    q.targetRole === role && (isRep || members.some((m) => m.userId === me.userId && m.teamRole === role));

  // API는 최신 줄부터 준다 — 대화처럼 오래된 줄이 위로 가게 뒤집는다
  const messages = [...(feed.data ?? [])].reverse();
  const rows = toRows(messages, questions);
  const inline = new Set(rows.flatMap((r) => (r.question ? [r.question.id] : [])));
  // 질문 줄이 아직 불러오지 않은 이전 페이지에 있으면 카드가 피드에 없다 — 답할 질문은 아래에 따로 둔다
  const openElsewhere = questions.filter(
    (q) => q.targetRole === role && (q.status === "pending" || q.status === "agent_answered") && !inline.has(q.id),
  );
  const thinking = useThinking(messages);
  const newestId = feed.data?.[0]?.id;
  const scrollRef = useRef<HTMLDivElement>(null);
  // 새 줄이 오면 맨 아래로. 이전 줄을 더 불러올 때는 newestId가 그대로라 움직이지 않는다
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [newestId]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-ink-200 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[16px] font-semibold tracking-tight">{meta.name}</h1>
          {room?.agent ? (
            <span
              className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-700"
              title={room.agent.lastSeenAt ? `마지막 확인 ${fmtDateTime(room.agent.lastSeenAt)}` : undefined}
            >
              <StatusDot status={room.agent.online ? "online" : "offline"} />
              {room.agent.agentName} · {room.agent.online ? "접속 중" : "오프라인"}
            </span>
          ) : (
            room && <span className="text-[12.5px] text-ink-500">배정된 에이전트 없음</span>
          )}
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
                <ol className="space-y-1.5">
                  {rows.map(({ message: m, question: q, folded }, i) => (
                    <Fragment key={m.id}>
                      {(i === 0 || !sameDay(rows[i - 1].message.ts, m.ts)) && (
                        <li className="py-2 text-center text-[11.5px] text-ink-400" aria-label="날짜">
                          {fmtDate(m.ts)}
                        </li>
                      )}
                      {q ? (
                        <li className="py-1">
                          <QuestionCard
                            question={q}
                            canAnswer={canAnswer(q)}
                            taskHref={`/p/${projectId}/tasks/${q.taskId}`}
                            taskTitle={m.taskTitle ?? undefined}
                          />
                          {/* 같은 질문의 뒤 줄(답함·내려놓음 등)은 카드 아래로 접는다 */}
                          <ul className="mt-1 space-y-0.5 pl-3">
                            {[m, ...folded].map((f) => (
                              <li key={f.id} className="text-[12px] text-ink-500">
                                <span className="font-mono tabular-nums text-ink-400">{fmtTime(f.ts)}</span> {f.text}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ) : (
                        <FeedRow message={m} role={role} />
                      )}
                    </Fragment>
                  ))}
                  {thinking && (
                    <li className="flex items-center gap-2 pl-[54px] text-[13px] text-ink-500" aria-live="polite">
                      <Loader2 size={13} className="animate-spin" aria-hidden />
                      생각 중…
                    </li>
                  )}
                </ol>
              )}
            </>
          )}

          {openElsewhere.length > 0 && (
            <section className="mt-6 space-y-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                {TEAM_ROLE_META[role].label}가 답할 질문 · {openElsewhere.length}
              </h2>
              {openElsewhere.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  canAnswer={canAnswer(q)}
                  taskHref={`/p/${projectId}/tasks/${q.taskId}`}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

type Activity = NonNullable<RoomMessage["activity"]>;

const TOOL_ICON: Record<Exclude<Activity["kind"], "say">, LucideIcon> = {
  read: FileText,
  edit: Pencil,
  write: FilePlus,
  run: Terminal,
  search: Search,
  other: Wrench,
};

/** 줄 하나. 에이전트의 말은 문장 블록, 도구는 아이콘 + 대상(고정폭), PM·NOMOS는 작고 흐린 시스템 줄 */
function FeedRow({ message: m, role }: { message: RoomMessage; role: TeamRole }) {
  const a = m.activity;
  const system = m.speaker !== "agent";

  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-6">
      <span className="w-11 shrink-0 font-mono text-[11.5px] text-ink-400 tabular-nums" title={fmtDateTime(m.ts)}>
        {fmtTime(m.ts)}
      </span>
      {system ? (
        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[12px] text-ink-500">
          <span className="font-semibold">{m.speaker === "pm" ? "PM" : "NOMOS"}</span> · {m.text}
        </span>
      ) : a?.kind === "say" ? (
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[14px] text-ink-900">{a.target}</p>
      ) : a ? (
        <ToolBlock activity={a} />
      ) : (
        // 활동 필드가 없는 에이전트 줄(인계 노트 등) — 서버 문장 그대로
        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-ink-900">
          <Badge tone={TEAM_ROLE_META[role].tone}>에이전트</Badge> {m.text}
        </span>
      )}
    </li>
  );
}

function ToolBlock({ activity: a }: { activity: Activity }) {
  const Icon = TOOL_ICON[a.kind as Exclude<Activity["kind"], "say">];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1">
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

/** 실행 중(AGENT_RUN_STARTED 뒤 ENDED 없음)인 태스크가 있고 몇 초간 새 줄이 없으면 true. 서버 데이터는 없다 */
function useThinking(messages: RoomMessage[]) {
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
  return active && last !== undefined && now - new Date(last).getTime() > IDLE_MS;
}
