"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Bot } from "lucide-react";
import { Badge, Button, CopyField, Logo } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import { errorMessage } from "@/shared/api";
import { CLI_NPX, useCreateConnectCode, useOrgAgents } from "@/entities/agent";
import { AccountMenu, HomeLink, RotateConnectKey, useCurrentUser } from "@/entities/user";
import { GITHUB_STEP, StepLabel } from "./steps";

// Executor는 오리진만 받는다 (/api는 스스로 붙인다)
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/?$/, "");
// CLI connect의 --server 기본값 (backend#7). 다른 서버일 때만 명시한다
const CLI_DEFAULT_SERVER = "https://nomos-team.duckdns.org";
const SERVER_FLAG = API_ORIGIN === CLI_DEFAULT_SERVER ? "" : ` --server ${API_ORIGIN}`;

const CODE = "font-mono text-ink-700";

// connect는 시작 전에 git·claude가 실행되는지 확인하고, 없으면 시작하지 않는다
const STEPS = [
  {
    title: "터미널에서 연결",
    commands: [],
    hint: (
      <>
        필요한 것: Node.js 22 이상 · git · Claude Code(설치 후 터미널에서 <code className={CODE}>claude</code>를 한 번
        실행해 로그인). 이 명령은 지금 로그인한 계정 전용이라, 노트북에 다른 계정 정보가 남아 있어도 이 계정으로
        연결됩니다. 에이전트 이름은 컴퓨터 이름으로 정해집니다. 창 없이 실행하려면 명령 끝에{" "}
        <code className={CODE}>--background</code>를 붙이세요 — 상태는{" "}
        <code className={CODE}>npx @capstone-nomos/cli@latest status</code>, 끄기는{" "}
        <code className={CODE}>npx @capstone-nomos/cli@latest stop</code>.
      </>
    ),
  },
  {
    title: "프로젝트에 배정되면 자동 실행",
    commands: [],
    hint: (
      <>
        켜 둔 터미널이 배정을 기다렸다가 자동으로 시작합니다. 태스크의 레포는{" "}
        <code className={CODE}>~/.nomos/repos/</code>에 자동으로 받습니다 — 비공개 레포면 이 컴퓨터의 git이 GitHub에
        접근할 수 있어야 합니다(<code className={CODE}>gh auth login</code> 또는 Git Credential Manager).
      </>
    ),
  },
];

const CLIS = [
  { id: "claude", name: "Claude Code", supported: true, note: "v1 지원" },
  { id: "codex", name: "Codex CLI", supported: false, note: "v2" },
  { id: "gemini", name: "Gemini CLI", supported: false, note: "v2" },
];

/**
 * 가입 흐름 3단계: 에이전트 연결. 다음은 GitHub 연동(/connect/github)이다.
 * joined: 초대 수락 직후. 이미 연결한 에이전트가 있으면 이 단계를 건너뛴다
 */
export function ConnectAgentView({ joined = false }: { joined?: boolean }) {
  const router = useRouter();
  // AuthGate 안에서만 그려지므로 me가 있다
  const me = useCurrentUser().me!;
  // 터미널에서 연결을 마치면 새로고침 없이 목록에 나타나게 한다
  const agents = useOrgAgents(me.orgId, { poll: true });
  const myAgents = agents.data?.agents.filter((a) => a.userId === me.userId) ?? [];
  const skip = joined && myAgents.length > 0;

  useEffect(() => {
    if (skip) router.replace(GITHUB_STEP);
  }, [skip, router]);

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <HomeLink>
          <Logo />
        </HomeLink>
        <AccountMenu />
      </header>
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-4 sm:px-6">
        <div className="card p-6 sm:p-8 animate-rise">
          {joined && (
            <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-[13.5px] font-medium text-brand-700">
              {me.orgName ?? "조직"}에 합류했습니다. 에이전트를 연결하세요.
            </p>
          )}
          <StepLabel step={3} />
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
              2. 터미널에서 연결
            </div>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <div className="mb-1.5 flex items-center gap-2 text-[13.5px] font-medium text-ink-900">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-600">
                      {i + 1}
                    </span>
                    {step.title}
                  </div>
                  <div className="space-y-1.5">
                    {i === 0 && <ConnectCommand />}
                    {step.commands.map((cmd) => (
                      <CopyField key={cmd} value={cmd} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-ink-500">{step.hint}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12.5px] text-ink-500">
              막히면 <code className={CODE}>{CLI_NPX} doctor</code>로 git·Claude Code·연결 상태를 점검하세요.
            </p>

            <details className="mt-5 rounded-xl border border-ink-200 p-4">
              <summary className="cursor-pointer text-[13.5px] font-medium text-ink-900">
                브라우저를 열 수 없는 환경(SSH 등)이라면 연결 키로 로그인
              </summary>
              {/* connect에 --connect-key를 주면 로그인 → 배정 대기 → 실행이 한 번에 된다 */}
              <div className="mt-3">
                <CopyField value={`${CLI_NPX} connect --connect-key${SERVER_FLAG}`} />
              </div>
              <p className="mt-2 text-[12.5px] text-ink-500">
                키를 물으면 <b>가입하면서 받은 연결 키</b>를 붙여넣으세요(환경변수{" "}
                <code className={CODE}>NOMOS_CONNECT_KEY</code>로 줘도 됩니다). 키는 서버에 해시로만 저장되어 다시
                보여줄 수 없습니다. 잃어버렸다면 아래에서 재발급하세요.
              </p>

              <div className="mt-3">
                <RotateConnectKey />
              </div>
            </details>
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

          <Button size="lg" className="mt-6" onClick={() => router.push(GITHUB_STEP)}>
            다음 <ArrowRight size={16} />
          </Button>
        </div>
      </main>
    </div>
  );
}

/** 1회용 연결 명령. 화면에 들어오면 바로 발급하고, 10분이 지났거나 이미 썼으면 새로 받는다 */
function ConnectCommand() {
  const issue = useCreateConnectCode();
  const { mutate } = issue;
  useEffect(() => mutate(), [mutate]);

  if (issue.isError)
    return (
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-forbidden">{errorMessage(issue.error)}</span>
        <Button size="sm" variant="outline" onClick={() => mutate()}>
          다시 받기
        </Button>
      </div>
    );
  if (!issue.data) return <p className="text-[12.5px] text-ink-500">연결 명령을 받는 중…</p>;
  return (
    <>
      <CopyField value={issue.data.command} />
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
        <span>{fmtDateTime(issue.data.expiresAt)}까지 한 번만 쓸 수 있습니다</span>
        <Button size="sm" variant="ghost" disabled={issue.isPending} onClick={() => mutate()}>
          {issue.isPending ? "받는 중…" : "새 명령 받기"}
        </Button>
      </div>
    </>
  );
}
