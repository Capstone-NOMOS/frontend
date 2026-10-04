"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Avatar, Button, CopyField, Logo, SectionTitle, Segmented } from "@/shared/ui";
import { fmtDateTime } from "@/shared/lib/format";
import { CollaboratorBadge, OrgRoleBadge, useCreateInvite, useOrgMembers } from "@/entities/org";
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

        <Members orgId={orgId} />
        {/* 대표 전용 UI는 팀원에게 렌더하지 않는다. 최종 판정은 API의 403 NOT_REPRESENTATIVE */}
        {isRep && <InvitePanel orgId={orgId} />}

        <RepoSection orgId={orgId} isRep={isRep} />
      </main>
    </div>
  );
}

function Members({ orgId }: { orgId: string }) {
  const members = useOrgMembers(orgId);

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
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
                  GitHub 협업자 <CollaboratorBadge isCollaborator={m.isCollaborator} />
                </span>
              </li>
            );
          })}
        </ul>
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
    </section>
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
