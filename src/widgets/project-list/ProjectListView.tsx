"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Badge, Button, Input, Logo } from "@/shared/ui";
import { StatusDot } from "@/entities/agent";
import { LEVELS } from "@/entities/policy";
import { AccountMenu, RoleBadge } from "@/entities/user";
import { useApp } from "@/lib/store";

export function ProjectListView() {
  const { state, me, hydrated } = useApp();
  const router = useRouter();
  const [invite, setInvite] = useState("");

  useEffect(() => {
    if (hydrated && !me) router.replace("/login");
  }, [hydrated, me, router]);

  if (!hydrated || !me) return null;

  const mine = state.projects.filter((p) => state.members.some((m) => m.projectId === p.id && m.userId === me.id));
  const myAgent = state.agents.find((a) => a.userId === me.id);

  const join = () => {
    const token = invite.trim().split("/").pop()?.split("?")[0];
    if (token) router.push(`/join/${token}`);
  };

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-500 sm:inline-flex">
            {myAgent?.connected ? (
              <>
                <StatusDot status={myAgent.status} /> 에이전트 연결됨
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
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pb-16 pt-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">프로젝트</h1>
            <p className="mt-1 text-[14px] text-ink-500">
              내가 속한 프로젝트와 역할입니다. 각 역할은 자기 Room만 봅니다.
            </p>
          </div>
          <Button href="/projects/new" size="md">
            <Plus size={15} /> 새 프로젝트
          </Button>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mine.map((p) => {
            const role = state.members.find((m) => m.projectId === p.id && m.userId === me.id)!.role;
            const members = state.members.filter((m) => m.projectId === p.id);
            const tasks = state.tasks.filter((t) => t.projectId === p.id);
            const level = LEVELS.find((l) => l.id === p.level)!;
            return (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="card block p-5 transition hover:border-ink-300 animate-rise">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[17px] font-semibold">{p.name}</span>
                        <RoleBadge role={role} />
                      </div>
                      <div className="mt-0.5 truncate text-[13px] text-ink-500">{p.description}</div>
                    </div>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-ink-400" />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
                    <Badge tone="brand">
                      {p.level} · {level.title}
                    </Badge>
                    <Badge>{p.stack}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {members.length}/3
                    </span>
                    <span>
                      태스크 {tasks.filter((t) => t.state === "DONE").length}/{tasks.length}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
          {mine.length === 0 && (
            <li className="col-span-full rounded-xl border border-dashed border-ink-200 bg-white/70 px-6 py-10 text-center">
              <p className="text-[14px] font-medium">아직 프로젝트가 없습니다</p>
              <p className="mt-1 text-[13px] text-ink-500">
                대표라면 새 프로젝트를 만들고, 팀원이라면 초대 링크로 참여하세요.
              </p>
            </li>
          )}
        </ul>

        <div className="card mt-6 p-5">
          <div className="text-[13.5px] font-semibold">초대 링크로 참여</div>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            대표가 보낸 링크를 붙여넣으세요. 역할(FE/BE)은 링크에 박혀 있습니다.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="https://nomos.app/join/Jz7kFE"
              className="h-10"
            />
            <Button variant="outline" onClick={join} className="shrink-0">
              참여
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
