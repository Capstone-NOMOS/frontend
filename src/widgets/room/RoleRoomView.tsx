"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
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

/**
 * 역할 룸(프로젝트 × 역할). 서버(PM)의 지시·판정, 실행 상태, 에이전트가 쓴 도구를 한 줄씩 보여 준다.
 * 문장은 서버가 만든다 — 화면은 text를 그대로 찍는다. 팀원은 자기 역할 룸만 본다 (403 ROOM_NOT_VISIBLE)
 */
export function RoleRoomView({ projectId, role }: { projectId: string; role: TeamRole }) {
  // AuthGate·AppShell 안쪽이므로 me와 프로젝트 상세가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const { members } = useProject(projectId).data!;
  const room = useRooms(projectId).data?.find((r) => r.role === role);
  const feed = useRoomFeed(projectId, role);
  const meta = ROOM_META[ROLE_ROOM[role].type];
  // 이 역할이 답해야 하는 질문. 답할 수 있는 사람은 그 역할의 담당자와 대표다
  const questions = useProjectQuestions(projectId).data?.filter((q) => q.targetRole === role) ?? [];
  const canAnswer = isRep || members.some((m) => m.userId === me.userId && m.teamRole === role);

  // API는 최신 줄부터 준다 — 대화처럼 오래된 줄이 위로 가게 뒤집는다
  const messages = [...(feed.data ?? [])].reverse();
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
              {messages.length === 0 ? (
                <EmptyState
                  title="아직 기록이 없습니다"
                  desc="프로젝트가 시작되어 태스크가 지시되면 실행 상태와 검증 결과가 여기에 한 줄씩 쌓입니다."
                />
              ) : (
                <ol className="space-y-1">
                  {messages.map((m, i) => (
                    <FeedRow
                      key={m.id}
                      message={m}
                      role={role}
                      newDay={i === 0 || !sameDay(messages[i - 1].ts, m.ts)}
                      hasQuestions={questions.length > 0}
                    />
                  ))}
                </ol>
              )}
            </>
          )}

          {questions.length > 0 && (
            <section id="questions" className="mt-6 scroll-mt-6 space-y-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                {TEAM_ROLE_META[role].label}가 답할 질문 · {questions.length}
              </h2>
              {questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  canAnswer={canAnswer}
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

function FeedRow({
  message: m,
  role,
  newDay,
  hasQuestions,
}: {
  message: RoomMessage;
  role: TeamRole;
  newDay: boolean;
  hasQuestions: boolean;
}) {
  return (
    <>
      {newDay && (
        <li className="py-2 text-center text-[11.5px] text-ink-400" aria-label="날짜">
          {fmtDate(m.ts)}
        </li>
      )}
      <li className="flex items-start gap-2.5 text-[13px] leading-6">
        <span className="w-11 shrink-0 font-mono text-[11.5px] text-ink-400 tabular-nums" title={fmtDateTime(m.ts)}>
          {fmtTime(m.ts)}
        </span>
        <span className="w-[70px] shrink-0">
          {m.speaker === "pm" ? (
            <Badge tone="pm">PM</Badge>
          ) : m.speaker === "nomos" ? (
            <Badge>NOMOS</Badge>
          ) : (
            <Badge tone={TEAM_ROLE_META[role].tone}>에이전트</Badge>
          )}
        </span>
        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-ink-900">
          {m.text}
          {/* 질문 줄은 답할 쪽 룸에도 나온다 — 아래 답하기 카드로 잇는다 */}
          {m.type === "QUESTION_ASKED" && hasQuestions && (
            <>
              {" "}
              <a href="#questions" className="text-[12.5px] font-medium underline underline-offset-2">
                답하기
              </a>
            </>
          )}
        </span>
      </li>
    </>
  );
}
