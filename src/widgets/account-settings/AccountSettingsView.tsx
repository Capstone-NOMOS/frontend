"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, Link2, Loader2 } from "lucide-react";
import { ApiError, errorMessage } from "@/shared/api";
import { Badge, Button, Logo, SectionTitle } from "@/shared/ui";
import { orgKeys } from "@/entities/org";
import { AccountMenu, RotateConnectKey, displayName, useCurrentUser, useGithubDeviceFlow } from "@/entities/user";

export function AccountSettingsView() {
  // AuthGate 안쪽이므로 me와 조직이 있다
  const me = useCurrentUser().me!;

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-[720px] space-y-4 px-4 pb-16 pt-4 sm:px-6">
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> 프로젝트
          </Link>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight">계정 설정</h1>
        </div>

        <section className="card p-5">
          <SectionTitle>프로필</SectionTitle>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
            <Row k="표시 이름">{displayName(me)}</Row>
            <Row k="아이디">{me.loginId ?? "—"}</Row>
            <Row k="조직">{me.orgName ?? "아직 없음"}</Row>
            <Row k="역할">{me.orgRole === "REPRESENTATIVE" ? "대표" : me.orgRole === "MEMBER" ? "팀원" : "—"}</Row>
          </dl>
        </section>

        <section className="card p-5">
          <SectionTitle>연결 키</SectionTitle>
          <p className="mb-3 text-[13px] text-ink-500">
            브라우저를 열 수 없는 환경(SSH 등)에서 CLI를 연결할 때 씁니다. 키는 서버에 해시로만 저장되어 다시 보여줄 수
            없습니다.{" "}
            <Link href="/connect" className="font-medium text-ink-900 underline underline-offset-2">
              연결 안내
            </Link>
          </p>
          <RotateConnectKey />
        </section>

        <GithubSection githubLogin={me.githubLogin} />
      </main>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-ink-500">{k}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </div>
  );
}

/** 이 화면에서만 쓰는 문구. 다른 화면의 GITHUB_* 문구는 shared/api/errors.ts */
function githubError(error: unknown) {
  if (error instanceof ApiError && error.code === "GITHUB_UNAVAILABLE")
    return "서버에 GitHub 연동이 설정되지 않았습니다.";
  if (error instanceof ApiError && error.code === "GITHUB_ACCOUNT_TAKEN")
    return "이 GitHub 계정은 이미 다른 사용자에게 연결돼 있습니다.";
  return errorMessage(error);
}

function GithubSection({ githubLogin }: { githubLogin: string | null }) {
  const queryClient = useQueryClient();
  // 연동되면 조직 멤버의 협업자 확인(isCollaborator)이 채워진다 — 다른 엔티티라 위젯에서 무효화
  const onConnected = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orgKeys.all });
  }, [queryClient]);
  const { state, start, cancel } = useGithubDeviceFlow({ onConnected });

  return (
    <section className="card p-5">
      <SectionTitle>GitHub</SectionTitle>
      <p className="mb-3 text-[13px] text-ink-500">
        연동하면 조직 멤버 목록에서 레포 협업자인지 확인되고, 레포를 연결할 때 GitHub 목록에서 고를 수 있습니다.
      </p>

      {githubLogin && state.step !== "connected" ? (
        <p className="flex items-center gap-2 text-[14px]">
          <Link2 size={16} /> 연동됨 <Badge tone="success">@{githubLogin}</Badge>
        </p>
      ) : state.step === "connected" ? (
        <p className="flex items-center gap-2 text-[14px] font-medium text-auto">
          <Check size={16} /> @{state.githubLogin} 계정이 연동됐습니다.
        </p>
      ) : state.step === "waiting" ? (
        <div className="space-y-3">
          <p className="text-[13.5px] text-ink-700">GitHub 페이지에서 아래 코드를 입력하고 승인하세요.</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 font-mono text-[24px] font-semibold tracking-[0.2em]">
              {state.userCode}
            </code>
            {/* 폴링은 이 탭에서 계속해야 하므로 GitHub는 새 탭으로 연다 */}
            <a
              href={state.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 hover:bg-ink-50"
            >
              <ExternalLink size={14} /> GitHub 열기
            </a>
          </div>
          <p className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
            <Loader2 size={13} className="animate-spin" /> 승인을 기다리는 중 · 이 화면을 떠나면 확인을 멈춥니다
          </p>
          <Button variant="ghost" size="sm" onClick={cancel}>
            취소
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {state.step === "expired" && <p className="text-[13px] text-human">코드가 만료됐습니다. 다시 시작하세요.</p>}
          {state.step === "denied" && <p className="text-[13px] text-human">GitHub에서 거부됐습니다.</p>}
          {state.step === "error" && <p className="text-[13px] text-forbidden">{githubError(state.error)}</p>}
          <Button onClick={() => void start()} disabled={state.step === "starting"}>
            <Link2 size={15} />{" "}
            {state.step === "starting" ? "시작하는 중…" : state.step === "idle" ? "GitHub 연동" : "다시 시작"}
          </Button>
        </div>
      )}
    </section>
  );
}
