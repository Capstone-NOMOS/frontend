"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Loader2, Plus } from "lucide-react";
import { ApiError, errorMessage } from "@/shared/api";
import { Badge, Button, Logo, MockBadge } from "@/shared/ui";
import { useOrgAgents } from "@/entities/agent";
import { LEVELS } from "@/entities/policy";
import { ProjectStatusBadge, fmtUsd, useProjects } from "@/entities/project";
import { AccountMenu, useCurrentUser, userKeys } from "@/entities/user";

export function ProjectListView() {
  // AuthGate 안쪽이므로 me와 orgId가 있다
  const me = useCurrentUser().me!;
  const orgId = me.orgId!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const queryClient = useQueryClient();

  const projects = useProjects(orgId, { pollWhileEmpty: !isRep });
  const agents = useOrgAgents(orgId);
  const myAgent = agents.data?.agents.find((a) => a.userId === me.userId);

  // 조직 소속이 바뀌었다(탈퇴·다른 조직). me를 다시 불러 AuthGate가 재라우팅하게 한다
  const error = projects.error;
  useEffect(() => {
    if (error instanceof ApiError && (error.code === "CROSS_ORG_ACCESS" || error.code === "NOT_IN_ORG")) {
      void queryClient.invalidateQueries({ queryKey: userKeys.me() });
    }
  }, [error, queryClient]);

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-500 sm:inline-flex">
            {myAgent ? (
              <>
                <span className="h-2 w-2 rounded-full bg-auto" /> 에이전트 연결됨 · {myAgent.agentName}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-ink-300" /> 에이전트 미연결 ·{" "}
                <Link href="/connect" className="font-medium text-ink-900 hover:underline">
                  연결
                </Link>
              </>
            )}
          </span>
          <Link href="/org" className="text-[13px] font-medium text-ink-600 hover:text-ink-900">
            조직
          </Link>
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pb-16 pt-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">프로젝트</h1>
            <p className="mt-1 text-[14px] text-ink-500">
              {isRep ? `${me.orgName ?? "조직"}의 모든 프로젝트입니다.` : "내 에이전트가 배정된 프로젝트입니다."}
            </p>
          </div>
          {isRep && (
            <Button href="/projects/new" size="md">
              <Plus size={15} /> 새 프로젝트 <MockBadge />
            </Button>
          )}
        </div>

        {projects.isPending ? (
          <div className="mt-10 flex justify-center text-ink-400" aria-busy="true">
            <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
          </div>
        ) : projects.isError ? (
          <div className="mt-6 rounded-xl border border-ink-200 bg-white px-6 py-10 text-center">
            <p className="text-[14px] text-ink-700">{errorMessage(projects.error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void projects.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects.data.map((p) => {
              const level = LEVELS.find((l) => l.id === p.autonomyPreset);
              return (
                <li key={p.id}>
                  <Link href={`/p/${p.id}`} className="card block p-5 transition hover:border-ink-300 animate-rise">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[17px] font-semibold">{p.name}</span>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-ink-400" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
                      <Badge tone="brand">
                        {p.autonomyPreset}
                        {level && ` · ${level.title}`}
                      </Badge>
                      <span>PM 예산 {fmtUsd(p.pmBudgetUsd)}</span>
                      {p.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={12} /> {p.deadline}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
            {projects.data.length === 0 && (
              <li className="col-span-full rounded-xl border border-dashed border-ink-200 bg-white/70 px-6 py-10 text-center">
                {isRep ? (
                  <>
                    <p className="text-[14px] font-medium">아직 프로젝트가 없습니다</p>
                    <p className="mt-1 text-[13px] text-ink-500">새 프로젝트를 만들어 시작하세요.</p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-medium">
                      아직 배정된 프로젝트가 없습니다. 대표가 배정하면 여기에 나타납니다
                    </p>
                    <p className="mt-1 text-[13px] text-ink-500">
                      배정되려면 에이전트가 연결돼 있어야 합니다.{" "}
                      <Link href="/connect" className="font-medium text-ink-900 hover:underline">
                        에이전트 연결
                      </Link>
                    </p>
                  </>
                )}
              </li>
            )}
          </ul>
        )}
      </main>
    </div>
  );
}
