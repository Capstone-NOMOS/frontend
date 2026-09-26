"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, BookOpen, Copy, FileText, MessageSquare, Plug, Users } from "lucide-react";
import { AgentMark, Avatar, Badge, Button, EmptyState, SectionTitle } from "@/shared/ui";
import { cn, fmtKrw, fmtTime, fmtTokens, relTime } from "@/shared/lib/format";
import { AGENT_STATUS, StatusDot } from "@/entities/agent";
import { LEVELS } from "@/entities/policy";
import { ROOM_META } from "@/entities/room";
import { TaskBadge, type Task, type TaskState } from "@/entities/task";
import { RoleBadge } from "@/entities/user";
import { useApp, useProject } from "@/lib/store";

const COLUMNS: { key: string; label: string; states: TaskState[] }[] = [
  { key: "ready", label: "READY", states: ["READY", "QUEUED"] },
  { key: "progress", label: "IN PROGRESS", states: ["IN_PROGRESS", "SUBMITTED", "VERIFYING"] },
  { key: "waiting", label: "WAITING", states: ["WAITING_HUMAN", "ESCALATED", "FAILED"] },
  { key: "done", label: "DONE", states: ["DONE"] },
];

export function DashboardView({ projectId }: { projectId: string }) {
  const { state, me } = useApp();
  const { project, myRole, tasks, visibleRooms, agentFor, userFor, docs, events, repos, rooms } = useProject(projectId);

  const pending = useMemo(() => {
    const roomIds = new Set(visibleRooms.map((r) => r.id));
    return state.messages
      .filter((m) => roomIds.has(m.roomId) && m.card)
      .filter((m) => {
        const c = m.card!;
        const room = visibleRooms.find((r) => r.id === m.roomId)!;
        const writable = myRole === "OWNER" ? room.type === "OWNER" : room.type === myRole;
        if (c.kind === "spec" && c.status === "pending") return myRole === "OWNER";
        if (c.kind === "report" && c.status === "pending") return myRole === "OWNER";
        if (c.kind === "question" && !c.answer) return true;
        if (c.kind === "repo" && c.status === "pending") return writable;
        return false;
      })
      .map((m) => ({ m, room: visibleRooms.find((r) => r.id === m.roomId)! }));
  }, [state.messages, visibleRooms, myRole]);

  if (!project || !me) return null;

  const budgetPct = Math.min(100, Math.round((project.pmSpentTokens / project.pmBudgetTokens) * 100));
  const level = LEVELS.find((l) => l.id === project.level)!;
  const ownerRoom = rooms.find((r) => r.type === "OWNER");
  const myRoom = visibleRooms.find((r) => r.type === (myRole === "OWNER" ? "OWNER" : myRole));
  const roomFor = (task: Task) => rooms.find((r) => r.type === task.role);
  const recent = events.slice().sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 8);
  const costs = {
    FE: tasks.filter((t) => t.role === "FE").reduce((a, t) => a + t.costKrw, 0),
    BE: tasks.filter((t) => t.role === "BE").reduce((a, t) => a + t.costKrw, 0),
    PM: events.filter((e) => e.actor === "PM" && e.costKrw).reduce((a, e) => a + (e.costKrw ?? 0), 0),
  };
  const costMax = Math.max(1, costs.FE, costs.BE, costs.PM);
  const latestDocs = (["CONSTITUTION", "SPEC", "CONTRACT", "ADR"] as const).map((type) => ({ type, doc: docs.filter((d) => d.type === type).sort((a, b) => b.version - a.version)[0] }));
  const docLabel = { CONSTITUTION: "헌법", SPEC: "명세", CONTRACT: "계약", ADR: "결정기록" } as const;
  const docHref = { CONSTITUTION: "constitution", SPEC: "spec", CONTRACT: "contract", ADR: "adr" } as const;

  const inviteUrl = (role: "FE" | "BE") => `${typeof window !== "undefined" ? window.location.origin : ""}/join/${project.inviteTokens[role]}`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight">{project.name}</h1>
              <Badge tone="brand">{project.level} · {level.title}</Badge>
              <Badge>{project.stack}</Badge>
            </div>
            <p className="mt-1 text-[14px] text-ink-500">{project.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {myRoom && (
              <Button href={`/p/${projectId}/rooms/${myRoom.id}`} size="md">
                <MessageSquare size={15} /> {ROOM_META[myRoom.type].name.split(" · ")[0]} 열기
              </Button>
            )}
            <Button href={`/p/${projectId}/docs/spec`} variant="outline">
              <FileText size={15} /> 문서
            </Button>
          </div>
        </div>

        {/* budget */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile label="PM 예산 (NOMOS 부담)" value={`${fmtTokens(project.pmSpentTokens)} / ${fmtTokens(project.pmBudgetTokens)} 토큰`}>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div className={cn("h-full rounded-full", budgetPct >= 80 ? "bg-human" : "bg-brand-500")} style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-ink-500">
              <span>{budgetPct}% 사용</span>
              {budgetPct >= 80 ? <span className="inline-flex items-center gap-1 text-human"><AlertTriangle size={11} /> 80% 경고</span> : <span>80%에서 대표에게 경고</span>}
            </div>
          </Tile>
          <Tile label="태스크" value={`${tasks.filter((t) => t.state === "DONE").length} / ${tasks.length} 완료`}>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COLUMNS.map((c) => {
                const n = tasks.filter((t) => c.states.includes(t.state)).length;
                return (
                  <span key={c.key} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-600">
                    {c.label} {n}
                  </span>
                );
              })}
            </div>
          </Tile>
          <Tile label="이번 기능 비용 (사람별)" value={fmtKrw(costs.FE + costs.BE + costs.PM)}>
            <ul className="mt-2 space-y-1">
              {(["FE", "BE", "PM"] as const).map((k) => (
                <li key={k} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-6 font-medium text-ink-600">{k}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span className={cn("block h-full rounded-full", k === "FE" ? "bg-fe-500" : k === "BE" ? "bg-be-500" : "bg-pm-chart")} style={{ width: `${(costs[k] / costMax) * 100}%` }} />
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
              <SectionTitle>멤버 · 에이전트</SectionTitle>
              <ul className="space-y-3">
                <li><MemberRow name={userFor("OWNER")?.nickname ?? "대표"} role="OWNER" sub="PM 에이전트 · NOMOS 서버" dot="online" /></li>
                {(["FE", "BE"] as const).map((role) => {
                  const u = userFor(role);
                  const a = agentFor(role);
                  const repo = repos.find((r) => r.ownerRole === role);
                  if (!u) {
                    return (
                      <li key={role} className="rounded-lg border border-dashed border-ink-200 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[13px] text-ink-500"><RoleBadge role={role} /> 아직 참여하지 않음</span>
                          {myRole === "OWNER" && (
                            <button onClick={() => navigator.clipboard?.writeText(inviteUrl(role)).catch(() => undefined)} className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-1 text-[11.5px] font-medium text-ink-700 hover:bg-ink-200">
                              <Copy size={11} /> 초대 링크
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={role}>
                      <MemberRow name={u.nickname} role={role} sub={a ? `${a.label} · ${AGENT_STATUS[a.status].label}` : "에이전트 미연결"} dot={a?.status ?? "offline"} tone={role === "FE" ? "fe" : "be"} />
                      <div className="ml-10 mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                        <Plug size={11} /> {repo ? repo.url.replace("https://github.com/", "") : "레포 미연결"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card p-4">
              <SectionTitle>문서 (MCP)</SectionTitle>
              <ul className="space-y-1">
                {latestDocs.map(({ type, doc }) => (
                  <li key={type}>
                    <Link href={`/p/${projectId}/docs/${docHref[type]}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50">
                      {type === "CONSTITUTION" ? <BookOpen size={14} className="text-ink-500" /> : <FileText size={14} className="text-ink-500" />}
                      <span className="flex-1">{docLabel[type]}</span>
                      {doc ? <span className="text-[11.5px] text-ink-500">{type === "ADR" ? `${(doc.content.match(/## ADR-/g) ?? []).length}건` : `v${doc.version}`}</span> : <span className="text-[11.5px] text-ink-400">없음</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-4">
              <SectionTitle>Rooms</SectionTitle>
              <ul className="space-y-1">
                {visibleRooms
                  .slice()
                  .sort((a, b) => ROOM_META[a.type].no - ROOM_META[b.type].no)
                  .map((r) => (
                    <li key={r.id}>
                      <Link href={`/p/${projectId}/rooms/${r.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50">
                        <MessageSquare size={14} className="text-ink-500" />
                        <span className="flex-1">{ROOM_META[r.type].name}</span>
                        <span className="text-[11.5px] text-ink-500">{ROOM_META[r.type].who}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </div>

          {/* right column */}
          <div className="space-y-6">
            <section className="card p-4">
              <SectionTitle action={<span className="text-[11.5px] text-ink-500">{myRole === "OWNER" ? "전체" : `${myRole} 태스크만`}</span>}>태스크</SectionTitle>
              {tasks.length === 0 ? (
                <EmptyState title="아직 태스크가 없습니다" desc="대표가 Room 3에서 요구사항을 적고 명세를 승인하면 태스크가 생성됩니다." action={ownerRoom && myRole === "OWNER" ? <Button href={`/p/${projectId}/rooms/${ownerRoom.id}`} size="sm">Room 3에서 시작</Button> : undefined} />
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
                  <div className="grid min-w-[640px] grid-cols-4 gap-3">
                    {COLUMNS.map((col) => {
                      const items = tasks.filter((t) => col.states.includes(t.state));
                      return (
                        <div key={col.key} className="rounded-xl bg-ink-50 p-2">
                          <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                            <span>{col.label}</span>
                            <span>{items.length}</span>
                          </div>
                          <div className="space-y-2">
                            {items.map((t) => {
                              const room = roomFor(t);
                              return (
                                <Link key={t.id} id={t.id} href={room && (myRole === "OWNER" || room.type === myRole) ? `/p/${projectId}/rooms/${room.id}` : "#"} className="block rounded-lg border border-ink-200 bg-white p-2.5 shadow-card transition hover:border-ink-300">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11.5px] text-ink-500">{t.id}</span>
                                    <Badge tone={t.role === "FE" ? "fe" : "be"}>{t.role}</Badge>
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium leading-snug">{t.title}</div>
                                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
                                    <TaskBadge state={t.state} />
                                    <span className="tabular-nums">{t.costKrw ? fmtKrw(t.costKrw) : ""}</span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="card p-4">
              <SectionTitle>승인 · 결정 대기</SectionTitle>
              {pending.length === 0 ? (
                <p className="text-[13px] text-ink-500">(없음) — 대기 중인 승인·질의가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map(({ m, room }) => {
                    const c = m.card!;
                    const label = c.kind === "spec" ? `명세 v${c.version} 승인 대기 — ${c.title}` : c.kind === "report" ? `완료 보고서 확인 — ${c.title}` : c.kind === "question" ? `에이전트 질의 · ${c.taskId} — ${c.question}` : c.kind === "repo" ? `${c.role} 레포 연결 대기` : "";
                    const tone = c.kind === "question" ? "warn" : "brand";
                    return (
                      <li key={m.id}>
                        <Link href={`/p/${projectId}/rooms/${room.id}#${m.id}`} className="flex items-center gap-3 rounded-lg border border-ink-200 px-3 py-2.5 hover:bg-ink-50">
                          <Badge tone={tone}>{c.kind === "question" ? "WAITING" : "승인"}</Badge>
                          <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
                          <span className="hidden text-[11.5px] text-ink-500 sm:inline">{ROOM_META[room.type].name}</span>
                          <ArrowRight size={14} className="text-ink-400" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="card p-4">
              <SectionTitle action={<Link href={`/p/${projectId}/activity`} className="text-[12px] font-medium text-brand-600 hover:underline">전체 보기</Link>}>최근 활동</SectionTitle>
              <ul className="divide-y divide-ink-100">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-2 text-[13px]">
                    <span className="w-11 shrink-0 pt-0.5 font-mono text-[11.5px] text-ink-400 tabular-nums">{fmtTime(e.ts)}</span>
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", e.tone === "danger" ? "bg-forbidden" : e.tone === "warn" ? "bg-human" : e.tone === "success" ? "bg-auto" : "bg-ink-300")} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{e.actor}</span> <span className="text-ink-600">{e.summary}</span>
                    </span>
                    <span className="hidden shrink-0 text-[11.5px] text-ink-400 sm:inline">{relTime(e.ts)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 text-[17px] font-semibold tabular-nums tracking-tight">{value}</div>
      {children}
    </div>
  );
}

function MemberRow({ name, role, sub, dot, tone }: { name: string; role: "OWNER" | "FE" | "BE"; sub: string; dot: "online" | "working" | "offline"; tone?: "fe" | "be" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        {role === "OWNER" ? <Avatar name={name} size={32} /> : <Avatar name={name} size={32} tone={tone} />}
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5"><StatusDot status={dot} pulse /></span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold">{name}</span>
          <RoleBadge role={role} />
        </div>
        <div className="flex items-center gap-1 truncate text-[11.5px] text-ink-500">
          {role === "OWNER" ? <Users size={11} /> : <AgentMark tone={tone ?? "pm"} size={14} />} {sub}
        </div>
      </div>
    </div>
  );
}
