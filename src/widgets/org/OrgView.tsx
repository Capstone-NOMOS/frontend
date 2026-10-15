"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import {
  Avatar,
  Badge,
  Button,
  ConfirmButton,
  CopyField,
  Logo,
  RemovalError,
  RevocationNotice,
  SectionTitle,
  Segmented,
} from "@/shared/ui";
import { fmtDateTime } from "@/shared/lib/format";
import { StatusDot, useDisconnectAgent, useOrgAgents } from "@/entities/agent";
import {
  CollaboratorBadge,
  OrgRoleBadge,
  useCreateInvite,
  useInvites,
  useOrgMembers,
  useRemoveMember,
  useRevokeInvite,
} from "@/entities/org";
import { TeamRoleBadge } from "@/entities/task";
import { AccountMenu, useCurrentUser } from "@/entities/user";
import { RepoSection } from "./RepoSection";

export function OrgView() {
  // AuthGate 안쪽이므로 me와 orgId가 있다
  const me = useCurrentUser().me!;
  const orgId = me.orgId!;
  const isRep = me.orgRole === "REPRESENTATIVE";

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-[880px] space-y-4 px-4 pb-16 pt-4 sm:px-6">
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> 프로젝트
          </Link>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight">{me.orgName ?? "조직"}</h1>
        </div>

        <Members orgId={orgId} myUserId={me.userId} isRep={isRep} />
        <Agents orgId={orgId} myUserId={me.userId} isRep={isRep} />
        {/* 대표 전용 UI는 팀원에게 렌더하지 않는다. 최종 판정은 API의 403 NOT_REPRESENTATIVE */}
        {isRep && <InvitePanel orgId={orgId} />}

        <RepoSection orgId={orgId} isRep={isRep} />
      </main>
    </div>
  );
}

function Members({ orgId, myUserId, isRep }: { orgId: string; myUserId: string; isRep: boolean }) {
  const members = useOrgMembers(orgId);
  const remove = useRemoveMember(orgId);

  return (
    <section className="card p-5">
      <SectionTitle>멤버</SectionTitle>
      {members.isPending ? (
        <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
          <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : members.isError ? (
        <div className="py-4 text-center">
          <p className="text-[13px] text-ink-700">{errorMessage(members.error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void members.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {members.data.map((m) => {
            const name = m.nickname ?? m.name ?? m.loginId ?? "이름 없음";
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium">{name}</span>
                    <OrgRoleBadge role={m.orgRole} />
                  </div>
                  <div className="text-[12.5px] text-ink-500">
                    {m.githubLogin ? `@${m.githubLogin}` : "GitHub 미연결"}
                    {/* 협업자 자동 초대에 GitHub 아이디가 필요하다. 연결은 본인만 할 수 있다 */}
                    {!m.githubLogin && m.userId === myUserId && (
                      <>
                        {" · "}
                        <Link
                          href="/settings/account"
                          className="font-medium text-ink-900 underline underline-offset-2"
                        >
                          GitHub 연결
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
                  GitHub 협업자 <CollaboratorBadge isCollaborator={m.isCollaborator} />
                </span>
                {/* 대표는 내보낼 수 없다(409 REPRESENTATIVE_CANNOT_LEAVE). 본인 탈퇴는 계정 설정에서 */}
                {isRep && m.orgRole !== "REPRESENTATIVE" && (
                  <ConfirmButton
                    label="내보내기"
                    confirm={`${name}의 에이전트도 연결이 해제됩니다.`}
                    pendingLabel="내보내는 중…"
                    pending={remove.isPending && remove.variables === m.userId}
                    onConfirm={() => remove.mutate(m.userId)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {remove.isError && (
        <div className="mt-2">
          <RemovalError error={remove.error} />
        </div>
      )}
      {remove.data && (
        <div className="mt-2">
          <RevocationNotice results={remove.data.githubRevocations} />
        </div>
      )}
    </section>
  );
}

/** 조직에 연결된 에이전트(노트북 CLI). 연결 해제는 주인과 대표만 (그 외 403 NOT_AGENT_OWNER) */
function Agents({ orgId, myUserId, isRep }: { orgId: string; myUserId: string; isRep: boolean }) {
  const agents = useOrgAgents(orgId);
  const disconnect = useDisconnectAgent();

  return (
    <section className="card p-5">
      <SectionTitle>에이전트</SectionTitle>
      {agents.isPending ? (
        <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
          <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : agents.isError ? (
        <p className="text-[13px] text-forbidden">{errorMessage(agents.error)}</p>
      ) : agents.data.agents.length === 0 ? (
        <p className="text-[13px] text-ink-500">
          연결된 에이전트가 없습니다.{" "}
          <Link href="/connect" className="font-medium text-ink-900 underline underline-offset-2">
            연결 안내
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {agents.data.agents.map((a) => (
            <li key={a.agentId} className="flex flex-wrap items-center gap-3 py-3">
              <Bot size={16} className="text-ink-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium">{a.agentName}</span>
                  <StatusDot status={a.online ? "online" : "offline"} />
                  {a.assignment && <Badge tone="info">프로젝트 배정됨</Badge>}
                </div>
                <div className="text-[12.5px] text-ink-500">
                  {a.nickname ?? "이름 없음"}의 에이전트 · {fmtDateTime(a.connectedAt)} 연결
                </div>
              </div>
              {(isRep || a.userId === myUserId) && (
                <ConfirmButton
                  label="연결 해제"
                  confirm={a.assignment ? "맡은 프로젝트에서도 빠집니다." : "다시 쓰려면 CLI로 다시 연결해야 합니다."}
                  pendingLabel="해제 중…"
                  pending={disconnect.isPending && disconnect.variables === a.agentId}
                  onConfirm={() => disconnect.mutate(a.agentId)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {disconnect.isError && (
        <div className="mt-2">
          <RemovalError error={disconnect.error} />
        </div>
      )}
      {disconnect.data && (
        <div className="mt-2">
          <RevocationNotice results={disconnect.data.githubRevocations} />
        </div>
      )}
    </section>
  );
}

const ROLES: { value: TeamRole | undefined; label: string }[] = [
  { value: undefined, label: "지정 안 함" },
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
];
const DAYS = [1, 7, 30];

function InvitePanel({ orgId }: { orgId: string }) {
  const invite = useCreateInvite(orgId);
  const [teamRole, setTeamRole] = useState<TeamRole | undefined>();
  const [expiresInDays, setExpiresInDays] = useState(7);

  return (
    <section className="card p-5">
      <SectionTitle>초대 링크 발급</SectionTitle>
      <div className="space-y-3">
        <Field label="역할">
          <Segmented options={ROLES} value={teamRole} onChange={setTeamRole} />
          <span className="text-[12px] text-ink-500">참고용이며 실제 역할은 프로젝트에서 배정합니다</span>
        </Field>
        <Field label="만료">
          <Segmented
            options={DAYS.map((d) => ({ value: d, label: `${d}일` }))}
            value={expiresInDays}
            onChange={setExpiresInDays}
          />
        </Field>
        <Button onClick={() => invite.mutate({ teamRole, expiresInDays })} disabled={invite.isPending} className="mt-1">
          {invite.isPending ? "발급 중…" : "링크 발급"}
        </Button>
        {invite.isError && <p className="text-[12.5px] text-forbidden">{errorMessage(invite.error)}</p>}
        {invite.data && (
          <div className="space-y-1.5">
            <CopyField label="초대 링크" value={invite.data.url} />
            <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
              {invite.data.teamRole && <TeamRoleBadge role={invite.data.teamRole} />}
              {fmtDateTime(invite.data.expiresAt)}까지 · 한 번 쓰면 만료됩니다
            </p>
          </div>
        )}
      </div>
      <PendingInvites orgId={orgId} />
    </section>
  );
}

/** 아직 쓰이지 않은 초대. 링크를 다시 복사하거나 취소한다. 이미 쓰인 초대는 목록에 없다 — 들어온 사람은 멤버에서 내보낸다 */
function PendingInvites({ orgId }: { orgId: string }) {
  const invites = useInvites(orgId);
  const revoke = useRevokeInvite(orgId);
  if (!invites.data?.length && !invites.isError) return null;

  return (
    <div className="mt-5 border-t border-ink-100 pt-4">
      <div className="mb-2 text-[13px] font-medium text-ink-700">대기 중인 초대</div>
      {invites.isError ? (
        <p className="text-[12.5px] text-forbidden">{errorMessage(invites.error)}</p>
      ) : (
        <ul className="space-y-3">
          {invites.data!.map((i) => (
            <li key={i.inviteId} className="space-y-1">
              <CopyField value={i.url} />
              <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
                {i.teamRole && <TeamRoleBadge role={i.teamRole} />}
                {i.expired ? <Badge>만료됨</Badge> : <span>{fmtDateTime(i.expiresAt)}까지</span>}
                <span>· {fmtDateTime(i.createdAt)} 발급</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(i.inviteId)}
                >
                  {revoke.isPending && revoke.variables === i.inviteId ? "취소 중…" : "초대 취소"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {revoke.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(revoke.error)}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-10 text-[13px] font-medium text-ink-700">{label}</span>
      {children}
    </div>
  );
}
