"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, GitBranch, Loader2, MessageSquare, Play } from "lucide-react";
import type { TeamRole } from "@/shared/model";
import { AgentMark, Badge, Button, EmptyState, SectionTitle } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
import { cn, fmtDateTime, relTime } from "@/shared/lib/format";
import { useQueryParam } from "@/shared/lib/useQueryParam";
import { StatusDot, useOrgAgents } from "@/entities/agent";
import { useProjectApprovals } from "@/entities/approval";
import { useContracts } from "@/entities/contract";
import { EventRow, makeEventLookup, useProjectEvents } from "@/entities/event";
import { useOrgMembers } from "@/entities/org";
import { ProjectErrorView, ProjectStatusBadge, useProject } from "@/entities/project";
import { DECISIONS_MAX, useDecisions } from "@/entities/question";
import { ROLE_ROOM, ROOM_META, useRooms } from "@/entities/room";
import { useSpecs } from "@/entities/spec";
import { ApiTaskBadge, BLOCKED_REASON, TASK_BOARD, TEAM_ROLE_META, TeamRoleBadge, useTasks } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

const ROLE_FILTERS: { value: TeamRole | undefined; label: string }[] = [
  { value: undefined, label: "전체" },
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
];
export function DashboardView({ projectId }: { projectId: string }) {
  // AppShell이 불러온 뒤에만 그려진다
  const { project, members, repos } = useProject(projectId).data!;
  // 뒤로가기(태스크 상세 → 대시보드)에도 칸반 필터가 남도록 주소에 둔다
  const [roleParam, setRoleParam] = useQueryParam("role", ["FRONTEND", "BACKEND"] as TeamRole[]);
  const teamRole = roleParam ?? undefined;
  const me = useCurrentUser().me;
  const isRep = me?.orgRole === "REPRESENTATIVE";
  // 접속 상태(online)를 보려고 조직 에이전트 목록을 폴링한다
  const agents = useOrgAgents(me?.orgId ?? null, { poll: true }).data?.agents;
  // 요약 타일은 전체 기준, 역할 필터는 칸반에만 건다. 한 번 받아 화면에서 거르므로 요청은 하나
  const tasks = useTasks(projectId);
  const approvals = useProjectApprovals(projectId);
  const events = useProjectEvents(projectId);
  const orgMembers = useOrgMembers(me?.orgId ?? "").data;
  const ownerOf = (userId: string) => {
    const o = orgMembers?.find((x) => x.userId === userId);
    return o?.nickname ?? o?.name ?? "팀원";
  };
  const specs = useSpecs(projectId);
  const contracts = useContracts(projectId);
  const decisions = useDecisions(projectId, null, DECISIONS_MAX);

  const rooms = useRooms(projectId).data ?? [];
  const myMember = members.find((m) => m.userId === me?.userId);
  const myTeamRole = myMember?.teamRole;

  const contractList = contracts.data ?? [];
  const docRows = [
    { href: "spec", label: "명세", count: specs.data?.length ?? 0, unit: "개" },
    {
      href: "contract",
      label: "계약",
      count: contractList.length,
      unit: `개 · ${contractList.filter((c) => c.status === "approved").length} 확정`,
    },
    { href: "adr", label: "결정기록", count: decisions.data?.length ?? 0, unit: "건" },
  ];

  const taskList = tasks.data ?? [];
  const boardList = teamRole ? taskList.filter((t) => t.teamRole === teamRole) : taskList;
  // 제목 옆 "완료" 수는 칸반 완료 칸과 같은 기준으로 센다
  const DONE_STATES = TASK_BOARD.find((c) => c.key === "done")!.states;
  // 진행 중인데 내 에이전트가 꺼져 있으면 태스크를 못 받는다. 다시 켜는 1회용 명령은 연결 화면이 새로 발급한다
  const myAgent = myMember?.agentId ? agents?.find((a) => a.agentId === myMember.agentId) : undefined;
  const myAgentOff = project.status === "active" && myAgent?.online === false;
  const myOpenTasks = taskList.filter(
    (t) => t.teamRole === myTeamRole && ["READY", "CLAIMED", "IN_PROGRESS"].includes(t.state),
  ).length;
  const lookup = makeEventLookup(taskList, agents, orgMembers);

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
              {project.questionMode === "experiment" && <Badge tone="warn">실험 모드</Badge>}
            </div>
            {project.deadline && (
              <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-ink-500">
                <CalendarDays size={13} /> 마감 {project.deadline}
              </p>
            )}
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

        {myAgentOff && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-human bg-human-bg px-4 py-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-[13.5px] text-ink-900">
              <strong>내 에이전트({myAgent.agentName})가 꺼져 있습니다.</strong>{" "}
              {myOpenTasks > 0 ? `할 태스크 ${myOpenTasks}개가 기다리고 있습니다. ` : ""}
              터미널에서 다시 연결해야 태스크를 받습니다 — 명령 끝에 <code className="font-mono">--background</code>를
              붙이면 터미널을 닫아도 계속 돕니다.
            </p>
            <Button href="/connect" size="sm">
              <Play size={14} /> 다시 연결하기
            </Button>
          </div>
        )}

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
                          <>
                            <span className="font-semibold">{m.agentName ?? "에이전트 연결 필요"}</span>
                            {/* 한 노트북에서 연결한 에이전트는 기본 이름(컴퓨터 이름)이 같다 — 담당자로 구분 */}
                            <span className="text-ink-500"> · {ownerOf(m.userId)}</span>
                          </>
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
              <SectionTitle>문서 (MCP)</SectionTitle>
              <ul className="space-y-1">
                {docRows.map((d) => (
                  <li key={d.href}>
                    <Link
                      href={`/p/${projectId}/docs/${d.href}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50"
                    >
                      <FileText size={14} className="text-ink-500" />
                      <span className="flex-1">{d.label}</span>
                      {d.count > 0 ? (
                        <span className="text-[11.5px] text-ink-500">
                          {d.count}
                          {d.unit}
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
              <SectionTitle>Rooms</SectionTitle>
              <ul className="space-y-1">
                {rooms.map((r) => (
                  <li key={r.role}>
                    <Link
                      href={`/p/${projectId}/rooms/${ROLE_ROOM[r.role].slug}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50"
                    >
                      <MessageSquare size={14} className="text-ink-500" />
                      <span className="flex-1">{ROOM_META[ROLE_ROOM[r.role].type].name}</span>
                      <span className="text-[11.5px] text-ink-500">
                        {r.activeTasks.length > 0 ? `진행 중 ${r.activeTasks.length}` : "진행 중인 태스크 없음"}
                      </span>
                    </Link>
                  </li>
                ))}
                {rooms.length === 0 && <li className="px-2 text-[12.5px] text-ink-400">볼 수 있는 룸이 없습니다</li>}
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
                        onClick={() => setRoleParam(f.value ?? null)}
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
                태스크{" "}
                <span className="normal-case tracking-normal text-ink-400">
                  · {taskList.filter((t) => DONE_STATES.includes(t.state)).length} / {taskList.length} 완료
                </span>
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
                  desc="대표가 대표 룸에서 PM의 계획 초안을 승인하면 태스크가 생성됩니다."
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
                          {/* 칸마다 따로 스크롤해 보드가 세로로 길어지지 않게 한다. 끝에 닿아도 페이지로 넘기지 않는다 */}
                          <div className="max-h-[26rem] space-y-2 overflow-y-auto overscroll-contain">
                            {items.map((t) => (
                              <Link
                                key={t.id}
                                href={`/p/${projectId}/tasks/${t.id}`}
                                className="block min-w-0 rounded-lg border border-ink-200 bg-white p-2.5 shadow-card transition hover:border-ink-300"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <ApiTaskBadge state={t.state} />
                                  {t.teamRole && <TeamRoleBadge role={t.teamRole} />}
                                </div>
                                <div
                                  className="mt-1.5 line-clamp-2 break-words text-[13px] font-medium leading-snug"
                                  title={t.title}
                                >
                                  {t.title}
                                </div>
                                {t.state === "BLOCKED" && t.blockedReason && (
                                  <div className="mt-1 text-[11px] font-medium text-human">
                                    {BLOCKED_REASON[t.blockedReason]}
                                  </div>
                                )}
                                {(t.state === "CLAIMED" || t.state === "IN_PROGRESS") && t.claimedAt && (
                                  <div className="mt-1 text-[11px] text-ink-500" title={fmtDateTime(t.claimedAt)}>
                                    수령 {relTime(t.claimedAt)}
                                  </div>
                                )}
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
                        <Badge tone="warn">
                          {a.gate === "G3" ? "통합 확인" : a.stage === "role_review" ? "담당 검토" : "승인"}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {a.gate === "G3" ? "모든 태스크 완료 · 프로젝트 완료 승인" : (a.taskTitle ?? "태스크")}
                        </span>
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
