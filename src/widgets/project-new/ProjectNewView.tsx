"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Check } from "lucide-react";
import { AgentMark, Badge, Button, CopyField, Logo } from "@/shared/ui";
import { cn } from "@/shared/lib/format";
import type { Level } from "@/shared/model";
import { LEVELS } from "@/entities/policy";
import type { Project } from "@/entities/project";
import { useApp } from "@/lib/store";

type Step = "name" | "desc" | "level" | "stack" | "done";
type Line = { from: "nomos" | "me"; text: string };

const PROMPTS: Record<Exclude<Step, "done">, string> = {
  name: "새 프로젝트를 만들어볼까요? 이름이 뭔가요?",
  desc: "어떤 프로젝트인지 한 줄로 알려주세요.",
  level:
    "에이전트 허용 레벨을 정해주세요. 레벨은 자율성이 아니라 '행동마다 누가 승인하는가'를 정한 표입니다. 안 고르면 L2가 기본값입니다.",
  stack: "기술 스택이 정해져 있나요? 없으면 PM이 첫 명세와 함께 제안합니다.",
};

export function ProjectNewView() {
  const { me, hydrated, actions } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [lines, setLines] = useState<Line[]>([{ from: "nomos", text: PROMPTS.name }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", level: "L2" as Level, stack: "" });
  const [project, setProject] = useState<Project | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && !me) router.replace("/login");
  }, [hydrated, me, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, typing, step]);

  useEffect(() => {
    if (!typing && step !== "level" && step !== "done") inputRef.current?.focus();
  }, [typing, step]);

  const say = (text: string, next: Step) => {
    setTyping(true);
    setTimeout(() => {
      setLines((l) => [...l, { from: "nomos", text }]);
      setTyping(false);
      setStep(next);
    }, 650);
  };

  const finish = (f: typeof form) => {
    const p = actions.createProject({ name: f.name, description: f.description, level: f.level, stack: f.stack });
    setProject(p);
    say(`프로젝트가 생성됐습니다. Room 3에서 PM과 바로 대화할 수 있고, FE·BE 초대 링크가 준비됐습니다.`, "done");
  };

  const submit = () => {
    const v = input.trim();
    if (step === "name") {
      if (!v) return;
      setLines((l) => [...l, { from: "me", text: v }]);
      setForm((f) => ({ ...f, name: v }));
      setInput("");
      say(PROMPTS.desc, "desc");
    } else if (step === "desc") {
      if (!v) return;
      setLines((l) => [...l, { from: "me", text: v }]);
      setForm((f) => ({ ...f, description: v }));
      setInput("");
      say(PROMPTS.level, "level");
    } else if (step === "stack") {
      const stack = v || "";
      setLines((l) => [...l, { from: "me", text: stack || "(없음 — PM이 제안)" }]);
      const f = { ...form, stack };
      setForm(f);
      setInput("");
      finish(f);
    }
  };

  const pickLevel = (level: Level) => {
    const l = LEVELS.find((x) => x.id === level)!;
    setLines((ls) => [...ls, { from: "me", text: `${level} · ${l.title}` }]);
    setForm((f) => ({ ...f, level }));
    say(PROMPTS.stack, "stack");
  };

  if (!hydrated || !me) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const stepIndex = ["name", "desc", "level", "stack", "done"].indexOf(step);

  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-200 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/projects" aria-label="프로젝트 목록">
            <Logo />
          </Link>
          <span className="hidden text-ink-300 sm:inline">/</span>
          <span className="hidden text-[13.5px] font-medium sm:inline">새 프로젝트</span>
        </div>
        <ol className="flex items-center gap-1.5">
          {["이름", "설명", "레벨", "스택"].map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-1 text-[11.5px]",
                i < stepIndex ? "text-auto" : i === stepIndex ? "text-ink-900 font-medium" : "text-ink-400",
              )}
            >
              {i < stepIndex ? (
                <Check size={11} />
              ) : (
                <span className={cn("h-1.5 w-1.5 rounded-full", i === stepIndex ? "bg-ink-900" : "bg-ink-300")} />
              )}
              <span className="hidden sm:inline">{s}</span>
            </li>
          ))}
        </ol>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6">
          <div className="space-y-4">
            {lines.map((l, i) =>
              l.from === "nomos" ? (
                <div key={i} className="flex gap-2.5 animate-rise">
                  <AgentMark tone="pm" size={30} />
                  <div className="min-w-0 pt-1">
                    <div className="mb-0.5 text-[12px] font-semibold text-ink-500">NOMOS</div>
                    <p className="max-w-[560px] text-[15px] leading-7 text-ink-900">{l.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end animate-rise">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink-100 px-4 py-2.5 text-[15px] leading-6">
                    {l.text}
                  </div>
                </div>
              ),
            )}

            {step === "level" && !typing && (
              <div className="ml-0 grid grid-cols-1 gap-2 sm:ml-10 sm:grid-cols-2 animate-rise">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => pickLevel(l.id)}
                    className="rounded-xl border border-ink-200 p-3.5 text-left transition hover:border-ink-900 hover:ring-2 hover:ring-ink-900/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold">
                        {l.id} <span className="font-medium">{l.title}</span>
                      </span>
                      {l.id === "L2" && <Badge>기본값</Badge>}
                    </div>
                    <div className="mt-1 text-[12.5px] text-ink-500">{l.detail}</div>
                  </button>
                ))}
              </div>
            )}

            {step === "done" && project && !typing && (
              <div className="ml-0 space-y-3 sm:ml-10 animate-rise">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold">{project.name}</span>
                    <Badge tone="brand">{project.level}</Badge>
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-500">
                    {project.description} · {project.stack}
                  </div>
                  <ul className="mt-3 space-y-1 text-[12.5px] text-ink-600">
                    <li>✓ 정책표 — {project.level} 열이 프로젝트에 적용됨</li>
                    <li>✓ Room 3 (대표 + PM) 생성 · PM 에이전트 인스턴스 (NOMOS 키)</li>
                    <li>✓ MCP 문서 페이지 — 헌법 / 명세 / 결정기록 / 계약 (빈 상태)</li>
                    <li>✓ 초대 링크 2개 — 역할이 링크에 박혀 있음</li>
                  </ul>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <CopyField label="FE 초대" value={`${origin}/join/${project.inviteTokens.FE}`} />
                    <CopyField label="BE 초대" value={`${origin}/join/${project.inviteTokens.BE}`} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => router.push(`/p/${project.id}`)}>
                    대시보드로 이동 <ArrowRight size={15} />
                  </Button>
                  <Button variant="outline" href={`/p/${project.id}/settings`}>
                    정책표 보기
                  </Button>
                </div>
              </div>
            )}

            {typing && (
              <div className="flex items-center gap-2.5">
                <AgentMark tone="pm" size={30} />
                <span className="inline-flex items-center gap-1 rounded-2xl bg-ink-100 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:300ms]" />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {step !== "done" && step !== "level" && (
        <div className="shrink-0 border-t border-ink-100 bg-white safe-bottom">
          <div className="mx-auto max-w-[720px] px-3 py-3 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-2 py-1.5 shadow-card focus-within:border-ink-300 focus-within:ring-4 focus-within:ring-ink-100"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={typing}
                placeholder={
                  step === "name"
                    ? "예: Jazzify"
                    : step === "desc"
                      ? "예: 재즈 음원 추천 웹앱"
                      : "예: Next.js + FastAPI (비워두면 PM이 제안)"
                }
                className="h-10 flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-ink-400"
              />
              <button
                type="submit"
                disabled={typing || (step !== "stack" && !input.trim())}
                aria-label="보내기"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white disabled:bg-ink-200"
              >
                <ArrowUp size={16} />
              </button>
            </form>
            {step === "stack" && (
              <div className="mt-1.5 text-center text-[11.5px] text-ink-500">비워두고 보내면 PM이 제안합니다</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
