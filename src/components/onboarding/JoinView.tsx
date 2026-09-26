"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar, Badge, Button, Logo, RoleBadge, StatusDot } from "@/components/ui";
import { LEVELS } from "@/lib/policy";

export function JoinView({ token }: { token: string }) {
  const { state, me, hydrated, actions } = useApp();
  const router = useRouter();
  const [joined, setJoined] = useState(false);

  const project = state.projects.find((p) => p.inviteTokens.FE === token || p.inviteTokens.BE === token);
  const role = project ? (project.inviteTokens.FE === token ? "FE" : "BE") : null;

  useEffect(() => {
    if (hydrated && !me) {
      try { localStorage.setItem("nomos.pendingJoin", token); } catch {}
      router.replace("/login");
    }
  }, [hydrated, me, router, token]);

  if (!hydrated || !me) return null;

  const wrap = (children: React.ReactNode) => (
    <div className="flex min-h-dvh flex-col dots-bg">
      <header className="flex h-16 items-center px-5 sm:px-8"><Link href="/" aria-label="NOMOS 홈"><Logo /></Link></header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[460px] animate-rise">{children}</div>
      </main>
    </div>
  );

  if (!project || !role) {
    return wrap(
      <div className="card p-6 sm:p-8 text-center">
        <h1 className="text-[20px] font-semibold">유효하지 않은 초대 링크입니다</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">링크가 만료됐거나 잘못됐습니다. 대표에게 새 링크를 요청하세요.</p>
        <Button href="/projects" variant="outline" className="mt-5">프로젝트 목록</Button>
      </div>,
    );
  }

  const existing = state.members.find((m) => m.projectId === project.id && m.role === role);
  const alreadyMe = existing?.userId === me.id;
  const taken = existing && !alreadyMe;
  const owner = state.users.find((u) => u.id === project.ownerId);
  const myAgent = state.agents.find((a) => a.userId === me.id);
  const level = LEVELS.find((l) => l.id === project.level)!;

  const join = () => {
    const res = actions.joinProject(token);
    if (res) {
      setJoined(true);
      try { localStorage.removeItem("nomos.pendingJoin"); } catch {}
    }
  };

  return wrap(
    <div className="card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        {owner && <Avatar name={owner.nickname} size={40} />}
        <div className="min-w-0">
          <div className="text-[12.5px] text-ink-500">{owner?.nickname} 님의 초대</div>
          <h1 className="truncate text-[20px] font-semibold tracking-tight">{project.name}</h1>
        </div>
      </div>
      <p className="mt-3 text-[13.5px] text-ink-600">{project.description}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge tone="brand">{project.level} · {level.title}</Badge>
        <Badge>{project.stack}</Badge>
      </div>

      <div className="mt-5 rounded-xl bg-ink-50 p-4">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <RoleBadge role={role} /> {role}로 참여합니다
        </div>
        <ul className="mt-2 space-y-1 text-[12.5px] text-ink-600">
          <li>· Room {role === "FE" ? 1 : 2}이 자동 생성됩니다 ({role} + {role} 에이전트 + PM)</li>
          <li>· 내 브릿지에 &ldquo;프로젝트 참여됨&rdquo; 이벤트가 가고 에이전트가 활성화됩니다</li>
          <li>· 참여 후 {role} 레포 URL과 로컬 경로를 연결합니다</li>
          <li>· 나는 Room {role === "FE" ? 1 : 2}만 볼 수 있고, 대표는 읽기만 합니다</li>
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-500">
        {myAgent?.connected ? <><StatusDot status={myAgent.status} /> {myAgent.label} 연결됨</> : <><span className="h-2 w-2 rounded-full bg-ink-300" /> 에이전트 미연결 — 참여 후 <Link href="/connect" className="font-medium text-ink-900 hover:underline">연결</Link>할 수 있습니다</>}
      </div>

      <div className="mt-5">
        {taken ? (
          <div className="rounded-xl border border-red-200 bg-forbidden-bg px-4 py-3 text-[13px] text-forbidden">이미 {role}가 있습니다. 역할당 1명만 참여할 수 있습니다 (2명 이상은 v2).</div>
        ) : joined || alreadyMe ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-auto-bg px-4 py-3 text-[13px] text-auto"><Check size={15} /> 참여 완료 — Room {role === "FE" ? 1 : 2}이 열렸습니다</div>
            <Button size="lg" className="w-full" onClick={() => router.push(`/p/${project.id}/rooms/${state.rooms.find((r) => r.projectId === project.id && r.type === role)?.id ?? ""}`)}>
              내 Room으로 이동 <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={join}>
            {project.name}에 {role}로 참여
          </Button>
        )}
      </div>
    </div>,
  );
}
