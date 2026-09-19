"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, TerminalSquare } from "lucide-react";
import { useApp } from "@/lib/store";
import { Badge, Button, CopyField, Logo } from "@/components/ui";
import { cn } from "@/lib/format";

const CLIS = [
  { id: "claude", name: "Claude Code", cmd: "npm i -g @anthropic-ai/claude-code", supported: true, note: "v1 지원" },
  { id: "codex", name: "Codex CLI", cmd: "npm i -g @openai/codex", supported: false, note: "v2" },
  { id: "gemini", name: "Gemini CLI", cmd: "npm i -g @google/gemini-cli", supported: false, note: "v2" },
];

const STEPS = [
  { key: "login", label: "로그인 (아이디/비밀번호 또는 토큰)", out: "✓ caleb 로 로그인됨" },
  { key: "detect", label: "로컬 Claude Code 감지 (claude --version)", out: "✓ claude 2.1.x 감지됨" },
  { key: "mcp", label: "NOMOS MCP 서버를 Claude Code 설정에 자동 등록", out: "✓ ~/.claude/settings.json 에 nomos MCP 등록" },
  { key: "ws", label: "서버와 WebSocket 연결", out: "✓ 연결됨. 프로젝트에 참여하면 에이전트가 활성화됩니다." },
];

export default function ConnectPage() {
  const { state, me, hydrated, actions } = useApp();
  const router = useRouter();
  const [cli, setCli] = useState("claude");
  const [progress, setProgress] = useState(-1);
  const timer = useRef<number | null>(null);
  const myAgent = me ? state.agents.find((a) => a.userId === me.id) : undefined;
  const connected = Boolean(myAgent?.connected) || progress >= STEPS.length;

  useEffect(() => {
    if (hydrated && !me) router.replace("/login");
  }, [hydrated, me, router]);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const simulate = () => {
    setProgress(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setProgress(i);
      if (i >= STEPS.length) {
        if (timer.current) window.clearInterval(timer.current);
        if (me) actions.connectAgent(me.id);
      }
    }, 750);
  };

  const next = () => {
    let pending: string | null = null;
    try { pending = localStorage.getItem("nomos.pendingJoin"); } catch {}
    router.push(pending ? `/join/${pending}` : "/projects");
  };

  if (!hydrated || !me) return null;

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈"><Logo /></Link>
        <Link href="/projects" className="text-[13px] font-medium text-ink-600 hover:text-ink-900">나중에 하기</Link>
      </header>
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-4 sm:px-6">
        <div className="card p-6 sm:p-8 animate-rise">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight">에이전트 연결</h1>
            {connected ? <Badge tone="success"><Check size={11} /> 연결됨</Badge> : <Badge>미연결</Badge>}
          </div>
          <p className="mt-1 text-[13.5px] text-ink-500">
            {me.nickname} 님의 노트북에서 브릿지를 설치하면, NOMOS 서버 — 나 — 내 에이전트가 연결됩니다. 브릿지는 태스크를 WebSocket으로 받아 로컬 에이전트를 기동하고, 실행 로그를 서버로 스트리밍합니다.
          </p>

          <div className="mt-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">1. 내가 쓰는 CLI</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CLIS.map((c) => (
                <button key={c.id} disabled={!c.supported} onClick={() => setCli(c.id)} className={cn("rounded-xl border p-3 text-left transition", cli === c.id ? "border-ink-900 ring-2 ring-ink-900/10" : "border-ink-200 hover:border-ink-300", !c.supported && "cursor-not-allowed opacity-60")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold">{c.name}</span>
                    <Badge tone={c.supported ? "success" : "neutral"}>{c.note}</Badge>
                  </div>
                  <code className="mt-1 block truncate font-mono text-[11px] text-ink-500">{c.cmd}</code>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">2. 터미널에서 브릿지 실행</div>
            <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-900 text-white">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11.5px] text-white/60"><TerminalSquare size={13} /> zsh</div>
              <div className="px-4 py-3 font-mono text-[13px] leading-6">
                <div><span className="text-white/40">$</span> npx nomos connect</div>
                {STEPS.slice(0, Math.max(0, progress)).map((s) => (
                  <div key={s.key} className="text-emerald-300">  {s.out}</div>
                ))}
                {progress >= 0 && progress < STEPS.length && (
                  <div className="flex items-center gap-2 text-white/70">  <Loader2 size={12} className="animate-spin" /> {STEPS[progress].label}…</div>
                )}
              </div>
            </div>
            <div className="mt-2">
              <CopyField value="npx nomos connect" />
            </div>
          </div>

          <ol className="mt-6 space-y-2">
            {STEPS.map((s, i) => {
              const done = connected || progress > i;
              const active = !connected && progress === i;
              return (
                <li key={s.key} className="flex items-center gap-3 text-[13.5px]">
                  <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", done ? "bg-auto text-white" : active ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-500")}>{done ? <Check size={12} /> : active ? <Loader2 size={12} className="animate-spin" /> : i + 1}</span>
                  <span className={cn(done ? "text-ink-900" : "text-ink-600")}>{s.label}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            {!connected ? (
              <Button size="lg" onClick={simulate} disabled={progress >= 0}>
                {progress >= 0 ? "연결 확인 중…" : "브릿지 연결 확인 (데모 시뮬레이션)"}
              </Button>
            ) : (
              <Button size="lg" onClick={next}>
                프로젝트로 이동 <ArrowRight size={16} />
              </Button>
            )}
            <span className="text-[12.5px] text-ink-500">브릿지가 끊기면 서버는 30초 안에 오프라인으로 표시합니다.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
