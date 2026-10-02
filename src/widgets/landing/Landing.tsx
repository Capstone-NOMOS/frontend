"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, CircleHelp, ShieldBan, Table2 } from "lucide-react";
import { AgentMark, Badge, Button, Logo } from "@/shared/ui";
import { CLI_NPX } from "@/entities/agent";
import { useCurrentUser } from "@/entities/user";

const STEPS = [
  {
    n: "01",
    t: "가입 · 키 발급 · 에이전트 연결",
    d: "터미널에서 로그인 한 번으로 내 Claude Code를 NOMOS에 붙입니다. 프로젝트에 참여하기 전엔 아무 태스크도 받지 않습니다.",
  },
  {
    n: "02",
    t: "프로젝트 생성 (채팅형)",
    d: "이름·설명·허용 레벨(L1–L4)·스택을 대화로 정하면 Room 3, PM 에이전트, MCP 문서 페이지, 초대 링크가 만들어집니다.",
  },
  {
    n: "03",
    t: "초대 → 역할 자동 배정 → Room",
    d: "FE·BE가 링크로 참여하면 Room 1·2가 열리고 각자 레포를 연결합니다. 각 개발자는 자기 Room만 봅니다.",
  },
  {
    n: "04",
    t: "요구사항 → 명세 → 승인 → 동시 분배 → 보고",
    d: "대표가 한 문장을 적으면 PM이 명세·계약·태스크로 정리하고, 승인 후 양쪽 에이전트에 동시에 보냅니다. 완료는 서버가 검증합니다.",
  },
];

export function Landing() {
  const { status } = useCurrentUser();
  const router = useRouter();
  const primary =
    status === "authenticated"
      ? { href: "/projects", label: "프로젝트로 이동" }
      : { href: "/signup", label: "시작하기" };

  // 로그인 상태면 랜딩을 건너뛴다. 조직이 없으면 /projects의 AuthGate가 /onboarding으로 보낸다
  useEffect(() => {
    if (status === "authenticated") router.replace("/projects");
  }, [status, router]);

  return (
    <div className="min-h-dvh bg-white">
      <header
        className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="#how"
              className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900 sm:inline"
            >
              작동 방식
            </Link>
            <Link
              href="#policy"
              className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900 sm:inline"
            >
              정책표
            </Link>
            <Button href="/login" variant="ghost" size="sm">
              로그인
            </Button>
            <Button href={primary.href} size="sm">
              {primary.label}
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden dots-bg">
        <div className="relative z-10 mx-auto max-w-[1120px] px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <Badge tone="brand" className="mb-5">
            DEVELOPER PREVIEW · 캡스톤 2026
          </Badge>
          <h1 className="max-w-[820px] text-[40px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[64px]">
            Your people, your agents,
            <br />
            <span className="text-ink-400">your rules</span> — all in one place.
          </h1>
          <p className="mt-6 max-w-[620px] text-[16px] leading-7 text-ink-600 sm:text-[18px] sm:leading-8">
            개발자 각자가 소유한 코딩 에이전트를 조직이 공유하는 규칙 위에서 작동하게 만들고, 사람의 의사결정과 의사결정
            사이의 실행 구간을 자동화하는 협업 플랫폼.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href={primary.href} size="lg">
              {primary.label} <ArrowRight size={16} />
            </Button>
            <Button href="/login" size="lg" variant="outline">
              데모 계정으로 둘러보기
            </Button>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-mono text-[12.5px] text-ink-600">
            <span className="text-ink-400">$</span> {CLI_NPX} connect
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 right-[-4%] z-0 select-none text-[160px] font-semibold leading-none tracking-[-0.06em] text-ink-100/80 blur-[1.5px] sm:-bottom-16 sm:text-[300px]"
        >
          NOMOS
        </div>
      </section>

      <section className="border-t border-ink-100">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-5 py-16 sm:px-8 md:grid-cols-3">
          <Feature
            icon={<Table2 size={18} />}
            title="행동별 승인 정책표"
            desc="에이전트의 17가지 행동을 L1–L4 표로 고정합니다. 탐지는 diff 경로·파일 패턴·도구 호출명뿐 — LLM 판단이 하나도 없습니다."
          />
          <Feature
            icon={<CircleHelp size={18} />}
            title="에이전트 → 사람 질의"
            desc="명세에 없는 결정을 만나면 지어내지 않고 담당 개발자에게 묻고 기다립니다. 답은 ADR로 남아 다음 에이전트가 다시 묻지 않습니다."
          />
          <Feature
            icon={<ShieldBan size={18} />}
            title="권한 게이트"
            desc="FE 에이전트가 BE 레포를 고치려 하면 브릿지가 거부하고, 우회해 제출해도 서버가 diff에서 잡아 반려합니다. 누가·어디를·언제 남습니다."
          />
        </div>
      </section>

      <section id="how" className="border-t border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8">
          <h2 className="text-[24px] font-semibold tracking-tight">작동 방식</h2>
          <p className="mt-2 max-w-[560px] text-[14.5px] text-ink-600">
            사람 개입은 승인 2회 + 질의 응답으로 수렴합니다. 나머지 구간은 상태 기계가 돕니다.
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="card p-5">
                <div className="font-mono text-[12px] text-ink-400">{s.n}</div>
                <div className="mt-1 text-[15.5px] font-semibold">{s.t}</div>
                <p className="mt-1.5 text-[13.5px] leading-6 text-ink-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="policy" className="border-t border-ink-100">
        <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight">세 개의 Room, 하나의 PM</h2>
              <p className="mt-2 text-[14.5px] leading-7 text-ink-600">
                PM만 세 Room에 전부 있습니다. FE 에이전트와 BE 에이전트는 서로 직접 대화하지 않고, 대표는 모든 Room을
                읽되 자기 Room에서만 씁니다. 채팅은 디스코드가 아니라 내 에이전트와의 1:1 대화처럼 흐릅니다.
              </p>
              <Button href="/login" variant="outline" className="mt-6">
                Room 둘러보기 <ArrowRight size={15} />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { name: "Room 3", who: "대표 + PM", tone: "pm" as const, note: "요구사항 · 승인 · 보고" },
                { name: "Room 1", who: "FE + FE 에이전트 + PM", tone: "fe" as const, note: "태스크 · 질의응답" },
                { name: "Room 2", who: "BE + BE 에이전트 + PM", tone: "be" as const, note: "태스크 · 질의응답" },
              ].map((r) => (
                <div key={r.name} className="card p-4">
                  <div className="flex items-center gap-2">
                    <AgentMark tone={r.tone} size={26} />
                    <span className="text-[14px] font-semibold">{r.name}</span>
                  </div>
                  <div className="mt-2 text-[12.5px] text-ink-600">{r.who}</div>
                  <div className="mt-1 text-[12px] text-ink-400">{r.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-3 px-5 py-8 text-[12.5px] text-ink-500 sm:flex-row sm:items-center sm:px-8">
          <Logo size={16} />
          <div>NOMOS — Networked Orchestration for Multi-Owner Systems · 최영현 · 오영훈 · 전병국</div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white">{icon}</div>
      <h3 className="mt-4 text-[16px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-6 text-ink-600">{desc}</p>
    </div>
  );
}
