"use client";

import { Check, ExternalLink, Link2, Loader2 } from "lucide-react";
import { ApiError, errorMessage } from "@/shared/api";
import { Badge, Button } from "@/shared/ui";
import { useGithubDeviceFlow } from "../model/githubDevice";

/** 이 컴포넌트에서만 쓰는 문구. 다른 화면의 GITHUB_* 문구는 shared/api/errors.ts */
function githubError(error: unknown) {
  if (error instanceof ApiError && error.code === "GITHUB_UNAVAILABLE")
    return "서버에 GitHub 연동이 설정되지 않았습니다.";
  if (error instanceof ApiError && error.code === "GITHUB_ACCOUNT_TAKEN")
    return "이 GitHub 계정은 이미 다른 사용자에게 연결돼 있습니다.";
  return errorMessage(error);
}

/**
 * GitHub 연동(Device Flow) 버튼과 진행 상태. 연동되면 me가 다시 불려 githubLogin이 채워진다.
 * onConnected: 다른 엔티티의 캐시(조직 멤버의 협업자 확인 등)를 무효화할 때 위젯이 넘긴다
 */
export function GithubConnect({ githubLogin, onConnected }: { githubLogin: string | null; onConnected?: () => void }) {
  const { state, start, cancel } = useGithubDeviceFlow({ onConnected });

  if (githubLogin && state.step !== "connected") {
    return (
      <p className="flex items-center gap-2 text-[14px]">
        <Link2 size={16} /> 연동됨 <Badge tone="success">@{githubLogin}</Badge>
      </p>
    );
  }
  if (state.step === "connected") {
    return (
      <p className="flex items-center gap-2 text-[14px] font-medium text-auto">
        <Check size={16} /> @{state.githubLogin} 계정이 연동됐습니다.
      </p>
    );
  }
  if (state.step === "waiting") {
    return (
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
    );
  }
  return (
    <div className="space-y-2">
      {state.step === "expired" && <p className="text-[13px] text-human">코드가 만료됐습니다. 다시 시작하세요.</p>}
      {state.step === "denied" && <p className="text-[13px] text-human">GitHub에서 거부됐습니다.</p>}
      {state.step === "error" && <p className="text-[13px] text-forbidden">{githubError(state.error)}</p>}
      <Button onClick={() => void start()} disabled={state.step === "starting"}>
        <Link2 size={15} />{" "}
        {state.step === "starting" ? "시작하는 중…" : state.step === "idle" ? "GitHub 연동" : "다시 시작"}
      </Button>
    </div>
  );
}
