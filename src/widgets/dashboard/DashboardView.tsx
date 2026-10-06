"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  GitBranch,
  Loader2,
  MessageSquare,
  Play,
} from "lucide-react";
import type { TeamRole } from "@/shared/model";
import { AgentMark, Badge, Button, EmptyState, MockBadge, SectionTitle } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
import { cn, fmtDateTime, fmtKrw, fmtTokens, relTime } from "@/shared/lib/format";
import { StatusDot, useOrgAgents } from "@/entities/agent";
import { useProjectApprovals } from "@/entities/approval";
import { EventRow, makeEventLookup, useProjectEvents } from "@/entities/event";
import { useOrgMembers } from "@/entities/org";
import { LEVELS } from "@/entities/policy";
import { ProjectErrorView, ProjectStatusBadge, fmtUsd, useProject } from "@/entities/project";
import { ROOM_META } from "@/entities/room";
import { ApiTaskBadge, TASK_BOARD, TEAM_ROLE_META, TeamRoleBadge, useTasks } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";
import { useProject as useMockProject } from "@/lib/store";

const ROLE_FILTERS: { value: TeamRole | undefined; label: string }[] = [
  { value: undefined, label: "전체" },
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
];

export function DashboardView({ projectId }: { projectId: string }) {
  // AppShell이 불러온 뒤에만 그려진다
  const { project, members, repos } = useProject(projectId).data!;
  const [teamRole, setTeamRole] = useState<TeamRole | undefined>();
  const me = useCurrentUser().me;
  const isRep = me?.orgRole === "REPRESENTATIVE";
  // 접속 상태(online)를 보려고 조직 에이전트 목록을 폴링한다
  const agents = useOrgAgents(me?.orgId ?? null, { poll: true }).data?.agents;
  // 요약 타일은 전체 기준, 역할 필터는 칸반에만 건다. 한 번 받아 화면에서 거르므로 요청은 하나
  const tasks = useTasks(projectId);
  const approvals = useProjectApprovals(projectId);
  const events = useProjectEvents(projectId);
  const orgMembers = useOrgMembers(me?.orgId ?? "").data;

  // 아래는 API가 없어 목업 스토어를 읽는 영역. 실제 프로젝트 id는 목업에 없으므로 대개 비어 있다
  const mock = useMockProject(projectId);
  const { myRole, visibleRooms, docs, rooms } = mock;

  const level = LEVELS.find((l) => l.id === project.autonomyPreset);
  const mockBudgetPct = mock.project
    ? Math.min(100, Math.round((mock.project.pmSpentTokens / mock.project.pmBudgetTokens) * 100))
    : null;
  const myRoom = visibleRooms.find((r) => r.type === (myRole === "OWNER" ? "OWNER" : myRole));
  const costs = {
    FE: mock.tasks.filter((t) => t.role === "FE").reduce((a, t) => a + t.costKrw, 0),
    BE: mock.tasks.filter((t) => t.role === "BE").reduce((a, t) => a + t.costKrw, 0),
    PM: mock.events.filter((e) => e.actor === "PM" && e.costKrw).reduce((a, e) => a + (e.costKrw ?? 0), 0),
  };
  const costMax = Math.max(1, costs.FE, costs.BE, costs.PM);
  const latestDocs = (["CONSTITUTION", "SPEC", "CONTRACT", "ADR"] as const).map((type) => ({
    type,
    doc: docs.filter((d) => d.type === type).sort((a, b) => b.version - a.version)[0],
  }));
  const docLabel = { CONSTITUTION: "헌법", SPEC: "명세", CONTRACT: "계약", ADR: "결정기록" } as const;
  const docHref = { CONSTITUTION: "constitution", SPEC: "spec", CONTRACT: "contract", ADR: "adr" } as const;

  const taskList = tasks.data ?? [];
  const boardList = teamRole ? taskList.filter((t) => t.teamRole === teamRole) : taskList;
  const lookup = makeEventLookup(taskList, agents, orgMembers);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight">{project.name}</h1>
              <Badge tone="brand">
                {project.autonomyPreset}
                {level && ` · ${level.title}`}
              </Badge>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.deadline && (
              <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-ink-500">
                <CalendarDays size={13} /> 마감 {project.deadline}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {myRoom && (
              <Button href={`/p/${projectId}/rooms/${myRoom.id}`} size="md">
                <MessageSquare size={15} /> {ROOM_META[myRoom.type].name.split(" · ")[0]} 열기
              </Button>
            )}
            <Button href={`/p/${projectId}/activity`} variant="outline">
              <FileText size={15} /> 활동
            </Button>
          </div>
        </div>

        {/* G1 전에는 에이전트가 태스크를 가져가지 않는다 (claim → 409 PROJECT_NOT_STARTED) */}
        {project.startedAt === null && project.status === "planning" && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-human bg-human-bg px-4 py-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-[13.5px] text-ink-900">
              <strong>아직 시작 전입니다.</strong>{" "}
              {isRep
                ? "역할을 배정하고 프로젝트를 시작해야 에이전트가 태스크를 받습니다."
                : "대표가 프로젝트를 시작하면 에이전트가 태스크를 받습니다."}
            </p>
            {isRep && (
              <Button href={`/p/${projectId}/settings#start`} size="sm">
                <Play size={14} /> 시작하러 가기
              </Button>
            )}
          </div>
        )}

        {/* summary */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile label="PM 예산" value={fmtUsd(project.pmBudgetUsd)}>
            <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-500">
              사용량 <MockBadge />
            </div>
            {mockBudgetPct !== null && mock.project ? (
              <>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={cn("h-full rounded-full", mockBudgetPct >= 80 ? "bg-human" : "bg-brand-500")}
                    style={{ width: `${mockBudgetPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-ink-500">
                  <span>
                    {fmtTokens(mock.project.pmSpentTokens)} / {fmtTokens(mock.project.pmBudgetTokens)} 토큰
                  </span>
                  {mockBudgetPct >= 80 && (
                    <span className="inline-flex items-center gap-1 text-human">
                      <AlertTriangle size={11} /> 80% 경고
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-1 text-[11.5px] text-ink-400">사용량 API 연결 전</p>
            )}
          </Tile>
          <Tile label="태스크" value={`${taskList.filter((t) => t.state === "DONE").length} / ${taskList.length} 완료`}>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TASK_BOARD.map((c) => (
                <span key={c.key} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-600">
                  {c.label} {taskList.filter((t) => c.states.includes(t.state)).length}
                </span>
              ))}
            </div>
          </Tile>
          <Tile
            label={
              <span className="flex items-center gap-1.5">
                이번 기능 비용 <MockBadge />
              </span>
            }
            value={fmtKrw(costs.FE + costs.BE + costs.PM)}
          >
            <ul className="mt-2 space-y-1">
              {(["FE", "BE", "PM"] as const).map((k) => (
                <li key={k} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-6 font-medium text-ink-600">{k}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        k === "FE" ? "bg-fe-500" : k === "BE" ? "bg-be-500" : "bg-pm-chart",
                      )}
                      style={{ width: `${(costs[k] / costMax) * 100}%` }}
                    />
                  </span>
                  <span className="w-14 text-right tabular-nums text-ink-600">{fmtKrw(costs[k])}</span>
                </li>
              ))}
            </ul>
          </Tile>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          {/* left column */}
          <div className="space-y-6">
            <section className="card p-4">
              <SectionTitle>에이전트 · 레포</SectionTitle>
              <ul className="space-y-3">
                {(["FRONTEND", "BACKEND"] as const).map((role) => {
                  const m = members.find((x) => x.teamRole === role);
                  const agent = m && agents?.find((a) => a.agentId === m.agentId);
                  const tone = TEAM_ROLE_META[role].tone;
                  return (
                    <li key={role} className="flex items-center gap-2.5">
                      <AgentMark tone={tone} size={28} />
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        {m ? (
                          <span className="font-semibold">{m.agentName}</span>
                        ) : (
                          <span className="text-ink-500">아직 배정되지 않음</span>
                        )}
                      </span>
                      {agent && (
                        <span
                          className="inline-flex items-center gap-1 text-[11.5px] text-ink-500"
                          title={agent.lastSeenAt ? `마지막 확인 ${fmtDateTime(agent.lastSeenAt)}` : undefined}
                        >
                          <StatusDot status={agent.online ? "online" : "offline"} />
                          {agent.online ? "접속 중" : "오프라인"}
                        </span>
                      )}
                      <TeamRoleBadge role={role} />
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-4 space-y-1 border-t border-ink-100 pt-3">
                {repos.map((r) => (
                  <li key={r.id} className="flex items-center gap-1.5 truncate text-[12px] text-ink-600">
                    <GitBranch size={12} className="shrink-0 text-ink-400" /> {r.fullName}
                  </li>
                ))}
                {repos.length === 0 && <li className="text-[12px] text-ink-400">연결된 레포 없음</li>}
              </ul>
            </section>

            <section className="card p-4">
              <SectionTitle action={<MockBadge />}>문서 (MCP)</SectionTitle>
              <ul className="space-y-1">
                {latestDocs.map(({ type, doc }) => (
                  <li key={type}>
                    <Link
                      href={`/p/${projectId}/docs/${docHref[type]}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50"
                    >
                      {type === "CONSTITUTION" ? (
                        <BookOpen size={14} className="text-ink-500" />
                      ) : (
                        <FileText size={14} className="text-ink-500" />
                      )}
                      <span className="flex-1">{docLabel[type]}</span>
                      {doc ? (
                        <span className="text-[11.5px] text-ink-500">
                          {type === "ADR" ? `${(doc.content.match(/## ADR-/g) ?? []).length}건` : `v${doc.version}`}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-ink-400">없음</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-4">
              <SectionTitle action={<MockBadge />}>Rooms</SectionTitle>
              <ul className="space-y-1">
                {visibleRooms
                  .slice()
                  .sort((a, b) => ROOM_META[a.type].no - ROOM_META[b.type].no)
                  .map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/p/${projectId}/rooms/${r.id}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50"
                      >
                        <MessageSquare size={14} className="text-ink-500" />
                        <span className="flex-1">{ROOM_META[r.type].name}</span>
                        <span className="text-[11.5px] text-ink-500">{ROOM_META[r.type].who}</span>
                      </Link>
                    </li>
                  ))}
                {rooms.length === 0 && <li className="px-2 text-[12.5px] text-ink-400">목업 데이터 없음</li>}
              </ul>
            </section>
          </div>

          {/* right column */}
          <div className="space-y-6">
            <section className="card p-4">
              <SectionTitle
                action={
                  <div className="inline-flex rounded-lg bg-ink-100 p-0.5" role="group" aria-label="역할 필터">
                    {ROLE_FILTERS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => setTeamRole(f.value)}
                        aria-pressed={teamRole === f.value}
                        className={cn(
                          "h-6 rounded-md px-2.5 text-[12px] font-medium",
                          teamRole === f.value ? "bg-white shadow-card" : "text-ink-600",
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                }
              >
                태스크
              </SectionTitle>
              {tasks.isPending ? (
                <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
                  <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
                </div>
              ) : tasks.isError ? (
                <ProjectErrorView error={tasks.error} onRetry={() => void tasks.refetch()} />
              ) : taskList.length === 0 ? (
                <EmptyState
                  title="아직 태스크가 없습니다"
                  desc="대표가 Room 3에서 PM의 계획 초안을 승인하면 태스크가 생성됩니다."
                  action={
                    isRep && (
                      <Button href={`/p/${projectId}/rooms/owner`} size="sm">
                        <MessageSquare size={14} /> PM에게 계획 받기
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
                  <div className="grid min-w-[640px] grid-cols-4 gap-3">
                    {TASK_BOARD.map((col) => {
                      const items = boardList.filter((t) => col.states.includes(t.state));
                      return (
                        <div key={col.key} className="rounded-xl bg-ink-50 p-2">
                          <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                            <span>{col.label}</span>
                            <span>{items.length}</span>
                          </div>
                          <div className="space-y-2">
                            {items.map((t) => (
                              <Link
                                key={t.id}
                                href={`/p/${projectId}/tasks/${t.id}`}
                                className="block rounded-lg border border-ink-200 bg-white p-2.5 shadow-card transition hover:border-ink-300"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <ApiTaskBadge state={t.state} />
                                  {t.teamRole && <TeamRoleBadge role={t.teamRole} />}
                                </div>
                                <div className="mt-1.5 text-[13px] font-medium leading-snug">{t.title}</div>
                                {t.retryCount > 0 && (
                                  <div className="mt-1 text-[11px] text-ink-500">재시도 {t.retryCount}회</div>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="card p-4">
              <SectionTitle
                action={
                  <Link
                    href={`/p/${projectId}/inbox`}
                    className="text-[12px] font-medium text-ink-500 hover:text-ink-900"
                  >
                    받은 편지함
                  </Link>
                }
              >
                승인 · 결정 대기
              </SectionTitle>
              {approvals.isPending ? (
                <Loader2 size={16} className="animate-spin text-ink-400" aria-label="불러오는 중" />
              ) : approvals.isError ? (
                <p className="text-[13px] text-forbidden">{errorMessage(approvals.error)}</p>
              ) : approvals.data.length === 0 ? (
                <p className="text-[13px] text-ink-500">(없음) — 대기 중인 승인이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {approvals.data.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/p/${projectId}/inbox#${a.id}`}
                        className="flex items-center gap-3 rounded-lg border border-ink-200 px-3 py-2.5 hover:bg-ink-50"
                      >
                        <Badge tone="warn">승인</Badge>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{a.taskTitle ?? "태스크"}</span>
                        <span className="hidden text-[11.5px] text-ink-500 sm:inline">{relTime(a.requestedAt)}</span>
                        <ArrowRight size={14} className="text-ink-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-4">
              <SectionTitle
                action={
                  <Link
                    href={`/p/${projectId}/activity`}
                    className="text-[12px] font-medium text-ink-500 hover:text-ink-900"
                  >
                    전체 보기
                  </Link>
                }
              >
                최근 활동
              </SectionTitle>
              {events.isPending ? (
                <Loader2 size={16} className="animate-spin text-ink-400" aria-label="불러오는 중" />
              ) : events.isError ? (
                <p className="text-[13px] text-forbidden">{errorMessage(events.error)}</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {events.data.slice(0, 8).map((e) => (
                    <EventRow key={e.id} event={e} lookup={lookup} />
                  ))}
                  {events.data.length === 0 && (
                    <li className="py-2 text-[12.5px] text-ink-400">아직 활동이 없습니다</li>
                  )}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, children }: { label: ReactNode; value: string; children?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 text-[17px] font-semibold tabular-nums tracking-tight">{value}</div>
      {children}
    </div>
  );
}
