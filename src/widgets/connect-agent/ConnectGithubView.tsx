"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button, Logo } from "@/shared/ui";
import { orgKeys } from "@/entities/org";
import { AccountMenu, GithubConnect, useCurrentUser } from "@/entities/user";
import { StepLabel } from "./steps";

/**
 * 온보딩 2단계: GitHub 연동. 건너뛸 수 없다 — 연동해야 대표는 레포를 고르고 만들 수 있고, 팀원은 레포 협업자로 초대된다.
 * 조직이 없으면(가입 직후 대표) 다음은 조직 만들기
 */
export function ConnectGithubView() {
  const router = useRouter();
  // AuthGate 안에서만 그려지므로 me가 있다
  const me = useCurrentUser().me!;
  const queryClient = useQueryClient();
  const nextHref = me.orgId ? "/projects" : "/onboarding";
  const ready = me.githubLogin !== null;
  // 연동되면 조직 멤버의 협업자 확인(isCollaborator)이 채워진다 — 다른 엔티티라 위젯에서 무효화
  const onConnected = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orgKeys.all });
  }, [queryClient]);

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <AccountMenu />
      </header>
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-4 sm:px-6">
        <div className="card p-6 sm:p-8 animate-rise">
          <Link
            href="/connect"
            className="mb-3 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft size={14} /> 에이전트 연결
          </Link>
          <StepLabel step={2} />
          <h1 className="text-[22px] font-semibold tracking-tight">GitHub 연동</h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            {me.orgRole === "MEMBER"
              ? "연동해야 프로젝트에 배정될 때 레포 협업자로 자동 초대됩니다."
              : "프로젝트 레포를 고르고 만들려면 GitHub 연동이 필요합니다. 팀원은 연동해야 레포 협업자로 자동 초대됩니다."}
          </p>

          <div className="mt-6">
            <GithubConnect githubLogin={me.githubLogin} onConnected={onConnected} />
          </div>

          <Button size="lg" className="mt-6" disabled={!ready} onClick={() => router.push(nextHref)}>
            다음 <ArrowRight size={16} />
          </Button>
          {!ready && <p className="mt-2 text-[12.5px] text-ink-500">GitHub를 연동하면 다음으로 넘어갈 수 있습니다.</p>}
        </div>
      </main>
    </div>
  );
}
