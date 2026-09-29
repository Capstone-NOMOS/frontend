"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Bot, KeyRound } from "lucide-react";
import { Badge, Button, CopyField, Logo } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import { errorMessage } from "@/shared/api";
import { useOrgAgents } from "@/entities/agent";
import { AccountMenu, useCurrentUser, useRotateConnectKey } from "@/entities/user";

const CLIS = [
  { id: "claude", name: "Claude Code", supported: true, note: "v1 지원" },
  { id: "codex", name: "Codex CLI", supported: false, note: "v2" },
  { id: "gemini", name: "Gemini CLI", supported: false, note: "v2" },
];

export function ConnectAgentView() {
  const router = useRouter();
  // AuthGate 안에서만 그려지므로 me가 있다
  const me = useCurrentUser().me!;
  const agents = useOrgAgents(me.orgId);
  const myAgents = agents.data?.agents.filter((a) => a.userId === me.userId) ?? [];
  const rotate = useRotateConnectKey();
  const [confirming, setConfirming] = useState(false);
  const nextHref = me.orgId ? "/projects" : "/onboarding";

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href={nextHref} className="text-[13px] font-medium text-ink-600 hover:text-ink-900">
            나중에 하기
          </Link>
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-4 sm:px-6">
        <div className="card p-6 sm:p-8 animate-rise">
          <h1 className="text-[22px] font-semibold tracking-tight">에이전트 연결</h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            내 노트북의 코딩 에이전트를 NOMOS에 연결합니다. 프로젝트에 배정되기 전까지 에이전트는 어떤 태스크도 받지
            않습니다.
          </p>

          <section className="mt-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">1. 내가 쓰는 CLI</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CLIS.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3",
                    c.supported ? "border-ink-900 ring-2 ring-ink-900/10" : "border-ink-200 opacity-60",
                  )}
                >
                  <span className="text-[14px] font-semibold">{c.name}</span>
                  <Badge tone={c.supported ? "success" : "neutral"}>{c.note}</Badge>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
              2. CLI에 연결 키 넣기
            </div>
            <p className="text-[13.5px] text-ink-700">
              NOMOS CLI로 연결할 때 <b>가입하면서 받은 연결 키</b>를 붙여넣으세요. 키는 서버에 해시로만 저장되어 다시
              보여줄 수 없습니다. 잃어버렸다면 아래에서 재발급하세요.
            </p>

            <div className="mt-3 rounded-xl border border-ink-200 p-4">
              {rotate.data ? (
                <>
                  <CopyField label="새 연결 키" value={rotate.data.connectKey} />
                  <p className="mt-2 text-[12.5px] font-medium text-human">
                    이 화면을 떠나면 다시 볼 수 없습니다. 지금 복사해 두세요.
                  </p>
                </>
              ) : confirming ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[13px] font-medium text-forbidden">기존 키는 즉시 무효가 됩니다.</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirming(false)}
                      disabled={rotate.isPending}
                    >
                      취소
                    </Button>
                    <Button size="sm" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
                      {rotate.isPending ? "재발급 중…" : "재발급"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                  <KeyRound size={14} /> 연결 키 재발급
                </Button>
              )}
              {rotate.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(rotate.error)}</p>}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
              3. 연결된 에이전트
            </div>
            {!me.orgId ? (
              <p className="text-[13px] text-ink-500">
                조직에 들어가기 전에는 연결 여부를 확인할 수 없습니다. 조직에 합류하면 연결한 에이전트가 여기
                나타납니다.
              </p>
            ) : agents.isPending ? (
              <p className="text-[13px] text-ink-500">불러오는 중…</p>
            ) : agents.isError ? (
              <p className="text-[13px] text-forbidden">{errorMessage(agents.error)}</p>
            ) : myAgents.length === 0 ? (
              <p className="text-[13px] text-ink-500">아직 연결된 에이전트가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {myAgents.map((a) => (
                  <li key={a.agentId} className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-2">
                    <Bot size={16} className="text-ink-500" />
                    <span className="flex-1 truncate text-[13.5px] font-medium">{a.agentName}</span>
                    <span className="text-[12px] text-ink-500">{fmtDateTime(a.connectedAt)} 연결</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Button size="lg" className="mt-6" onClick={() => router.push(nextHref)}>
            다음 <ArrowRight size={16} />
          </Button>
        </div>
      </main>
    </div>
  );
}
