"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Lock, Play } from "lucide-react";
import { errorDetails, errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Badge, Button, SectionTitle } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import { agentKeys, useOrgAgents } from "@/entities/agent";
import { DECIDER_META, LEVELS, LevelGates, POLICY_TABLE } from "@/entities/policy";
import {
  ProjectStatusBadge,
  fmtUsd,
  useAssignMember,
  useProject,
  useStartProject,
  useUnassignMember,
} from "@/entities/project";
import { TEAM_ROLE_META, TeamRoleBadge } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

const ROLES: TeamRole[] = ["FRONTEND", "BACKEND"];

type Member = Schemas["ProjectMember"];
type OrgAgent = Schemas["OrgAgent"];

export function SettingsView({ projectId }: { projectId: string }) {
  // AuthGate·AppShell 안쪽이므로 me와 프로젝트 상세가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const { project, repos, members } = useProject(projectId).data!;
  const started = project.startedAt !== null;
  // 에이전트 주인 닉네임·배정 후보. 접속 상태는 API가 주지 않는다
  const agents = useOrgAgents(me.orgId);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">프로젝트 설정</h1>
          <p className="mt-1 text-[14px] text-ink-500">
            {isRep
              ? "에이전트 역할을 배정하고 프로젝트를 시작합니다."
              : "대표가 역할을 배정하고 프로젝트를 시작합니다. 현재 설정을 확인하세요."}
          </p>
        </div>

        <section className="card p-5">
          <SectionTitle action={<span className="text-[12px] text-ink-400">변경 기능은 준비 중입니다</span>}>
            기본 정보
          </SectionTitle>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
            <Row k="이름">{project.name}</Row>
            <Row k="상태">
              <ProjectStatusBadge status={project.status} />
            </Row>
            <Row k="레벨">
              {project.autonomyPreset} · {LEVELS.find((l) => l.id === project.autonomyPreset)?.title}
            </Row>
            <Row k="PM 예산">{fmtUsd(project.pmBudgetUsd)}</Row>
            <Row k="전체 예산">{project.budgetUsd ? fmtUsd(project.budgetUsd) : "상한 없음"}</Row>
            <Row k="마감일">{project.deadline ?? "없음"}</Row>
            <Row k="레포">
              {repos.length > 0 ? (
                <span className="flex flex-col gap-0.5 font-mono text-[13px]">
                  {repos.map((r) => (
                    <span key={r.id}>{r.fullName}</span>
                  ))}
                </span>
              ) : (
                "없음"
              )}
            </Row>
          </dl>
        </section>

        <MembersSection
          projectId={projectId}
          orgId={me.orgId!}
          members={members}
          agents={agents.data?.agents}
          agentsError={agents.error}
          started={started}
          isRep={isRep}
        />

        <StartSection projectId={projectId} project={project} members={members} isRep={isRep} />

        <PolicySection level={project.autonomyPreset} />
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-ink-500">{k}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </div>
  );
}

function ownerName(agents: OrgAgent[] | undefined, agentId: string) {
  const a = agents?.find((x) => x.agentId === agentId);
  return a ? (a.nickname ?? "이름 없음") : null;
}

function MembersSection({
  projectId,
  orgId,
  members,
  agents,
  agentsError,
  started,
  isRep,
}: {
  projectId: string;
  orgId: string;
  members: Member[];
  agents: OrgAgent[] | undefined;
  agentsError: Error | null;
  started: boolean;
  isRep: boolean;
}) {
  const queryClient = useQueryClient();
  const assign = useAssignMember(projectId);
  const unassign = useUnassignMember(projectId);
  // 배정이 바뀌면 에이전트의 assignment도 바뀐다 (entities끼리 키를 못 쓰므로 위젯에서 무효화)
  const refreshAgents = () => queryClient.invalidateQueries({ queryKey: agentKeys.org(orgId) });
  const editable = isRep && !started;
  const busy = assign.isPending || unassign.isPending;
  const error = assign.error ?? unassign.error;

  return (
    <section id="members" className="card scroll-mt-6 p-5">
      <SectionTitle>역할 배정</SectionTitle>
      {started && (
        <p className="mb-3 flex items-center gap-1.5 text-[13px] text-ink-700">
          <Lock size={13} /> 시작된 프로젝트는 멤버를 바꿀 수 없습니다.
        </p>
      )}
      <ul className="divide-y divide-ink-100">
        {ROLES.map((role) => {
          const member = members.find((m) => m.teamRole === role);
          return (
            <li key={role} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-10">
                <TeamRoleBadge role={role} />
              </span>
              {member ? (
                <>
                  <span className="text-[14px] font-medium">{member.agentName}</span>
                  {ownerName(agents, member.agentId) && (
                    <span className="text-[12.5px] text-ink-500">{ownerName(agents, member.agentId)}의 에이전트</span>
                  )}
                  {editable && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      disabled={busy}
                      onClick={() => {
                        assign.reset();
                        unassign.mutate(member.agentId, { onSuccess: refreshAgents });
                      }}
                    >
                      {unassign.isPending && unassign.variables === member.agentId ? "해제 중…" : "해제"}
                    </Button>
                  )}
                </>
              ) : editable ? (
                <AssignPicker
                  role={role}
                  projectId={projectId}
                  members={members}
                  agents={agents}
                  disabled={busy}
                  pending={assign.isPending && assign.variables?.teamRole === role}
                  onAssign={(agentId) => {
                    unassign.reset();
                    assign.mutate({ agentId, teamRole: role }, { onSuccess: refreshAgents });
                  }}
                />
              ) : (
                <span className="text-[13px] text-ink-400">미배정</span>
              )}
            </li>
          );
        })}
      </ul>

      {editable && agents?.length === 0 && (
        <p className="mt-2 text-[12.5px] text-ink-500">
          연결된 에이전트가 없습니다. 팀원이 CLI로 연결해야 목록에 나타납니다 ·{" "}
          <Link href="/connect" className="font-medium text-ink-900 underline underline-offset-2">
            연결 안내
          </Link>
        </p>
      )}
      {agentsError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(agentsError)}</p>}
      {error && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(error)}</p>}
      {/* 배정 직후 서버 안내: 에이전트가 토큰을 재발급해야 태스크·노트 API를 쓸 수 있다 */}
      {assign.data && (
        <p className="mt-2 rounded-lg bg-review-bg px-3 py-2 text-[12.5px] text-review">{assign.data.notice}</p>
      )}
    </section>
  );
}

function AssignPicker({
  role,
  projectId,
  members,
  agents,
  disabled,
  pending,
  onAssign,
}: {
  role: TeamRole;
  projectId: string;
  members: Member[];
  agents: OrgAgent[] | undefined;
  disabled: boolean;
  pending: boolean;
  onAssign: (agentId: string) => void;
}) {
  const [agentId, setAgentId] = useState("");
  if (!agents) return <Loader2 size={15} className="animate-spin text-ink-400" aria-label="불러오는 중" />;

  // 에이전트는 한 번에 한 프로젝트만 맡는다 (409 AGENT_IN_ANOTHER_PROJECT). 이 프로젝트의 다른 역할도 안 된다
  const unavailable = (a: OrgAgent) =>
    (a.assignment !== null && a.assignment.projectId !== projectId) || members.some((m) => m.agentId === a.agentId);

  return (
    <span className="flex flex-1 flex-wrap items-center gap-2">
      <select
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        disabled={disabled || agents.length === 0}
        aria-label={`${TEAM_ROLE_META[role].label} 에이전트`}
        className="h-8 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 text-[13px] outline-none focus:border-brand-500 sm:max-w-[320px]"
      >
        <option value="">에이전트 선택</option>
        {agents.map((a) => (
          <option key={a.agentId} value={a.agentId} disabled={unavailable(a)}>
            {a.agentName} · {a.nickname ?? "이름 없음"}
            {a.assignment && a.assignment.projectId !== projectId ? " — 다른 프로젝트 진행 중" : ""}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={!agentId || disabled} onClick={() => onAssign(agentId)}>
        {pending ? "배정 중…" : "배정"}
      </Button>
    </span>
  );
}

/** where 값 → 사람이 읽는 이름. 서버 message가 이미 한국어라 이름과 이동 버튼만 붙인다 */
function whereLabel(where: string) {
  if (where === "tasks") return "태스크";
  const role = where.match(/^members\.(FRONTEND|BACKEND)$/)?.[1] as TeamRole | undefined;
  return role ? `${TEAM_ROLE_META[role].label} 배정` : where;
}

function StartSection({
  projectId,
  project,
  members,
  isRep,
}: {
  projectId: string;
  project: Schemas["Project"];
  members: Member[];
  isRep: boolean;
}) {
  const start = useStartProject(projectId);
  const [confirming, setConfirming] = useState(false);
  const details = errorDetails(start.error);

  return (
    <section id="start" className="card scroll-mt-6 p-5">
      <SectionTitle>프로젝트 시작</SectionTitle>
      {project.startedAt ? (
        <p className="flex items-center gap-2 text-[13.5px]">
          <CheckCircle2 size={16} className="text-auto" />
          {fmtDateTime(project.startedAt)}에 시작했습니다. 배정된 에이전트가 태스크를 받고 있습니다.
        </p>
      ) : !isRep ? (
        <p className="text-[13.5px] text-ink-700">대표가 프로젝트를 시작하면 배정된 에이전트가 태스크를 받습니다.</p>
      ) : (
        <>
          <p className="text-[13.5px] text-ink-700">
            시작해야 에이전트가 태스크를 받습니다. 시작하려면 태스크가 하나 이상 있고, 태스크가 있는 역할마다 에이전트가
            배정돼 있어야 합니다.
          </p>
          {confirming ? (
            <div className="mt-3 rounded-xl border border-human bg-human-bg p-4">
              <p className="text-[13.5px] font-medium">시작하면 멤버를 바꿀 수 없습니다.</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-700">
                지금 배정:
                {ROLES.map((role) => {
                  const m = members.find((x) => x.teamRole === role);
                  return (
                    <span key={role} className="inline-flex items-center gap-1">
                      <TeamRoleBadge role={role} /> {m ? m.agentName : "없음"}
                    </span>
                  );
                })}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={start.isPending}
                  onClick={() => start.mutate(undefined, { onSettled: () => setConfirming(false) })}
                >
                  {start.isPending ? "시작하는 중…" : "시작"}
                </Button>
                <Button variant="ghost" size="sm" disabled={start.isPending} onClick={() => setConfirming(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="mt-3"
              onClick={() => {
                start.reset();
                setConfirming(true);
              }}
            >
              <Play size={14} /> 프로젝트 시작
            </Button>
          )}
        </>
      )}

      {start.error && (
        <div className="mt-3 rounded-xl bg-forbidden-bg p-3 text-[13px]">
          <p className="font-medium text-forbidden">{errorMessage(start.error)}</p>
          {details.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {details.map((d, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-1.5 text-ink-700">
                  <Badge tone="danger">{whereLabel(d.where)}</Badge>
                  <span>{d.message}</span>
                  {d.where.startsWith("members.") && (
                    <a href="#members" className="text-[12.5px] font-medium text-ink-900 underline underline-offset-2">
                      역할 배정으로
                    </a>
                  )}
                  {d.where === "tasks" && (
                    <Link
                      href={`/p/${projectId}/rooms/owner`}
                      className="text-[12.5px] font-medium text-ink-900 underline underline-offset-2"
                    >
                      Room 3에서 PM 계획 받기
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function PolicySection({ level }: { level: Schemas["Project"]["autonomyPreset"] }) {
  return (
    <section className="card p-5">
      <SectionTitle>허용 레벨 · {level}</SectionTitle>
      <LevelGates level={level} />
      <p className="mt-3 text-[12.5px] text-ink-500">
        레벨은 자율성 정도가 아니라 <strong>행동마다 누가 승인하는가</strong>를 정한 표입니다. 🔒 항목은 레벨과 무관하게
        고정되며 대표도 바꿀 수 없습니다.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead className="bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">행동</th>
              <th className="px-3 py-2 text-left font-semibold">탐지 (결정적)</th>
              {LEVELS.map((l) => (
                <th
                  key={l.id}
                  className={cn("px-3 py-2 text-center font-semibold", level === l.id && "bg-brand-50 text-brand-600")}
                >
                  {l.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {POLICY_TABLE.map((r) => (
              <tr key={r.actionKey}>
                <td className="px-3 py-2 text-ink-400">{r.n}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    {r.locked && <Lock size={11} className="text-ink-400" />} {r.label}
                  </div>
                  <div className="font-mono text-[10.5px] text-ink-500">{r.actionKey}</div>
                </td>
                <td className="px-3 py-2 text-ink-700">{r.detect}</td>
                {LEVELS.map((l) => {
                  const m = DECIDER_META[r.deciders[l.id]];
                  return (
                    <td key={l.id} className={cn("px-3 py-2 text-center", level === l.id && "bg-brand-50/60")}>
                      <span className={cn("inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", m.cls)}>
                        {m.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
