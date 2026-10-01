"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge, Button, Input, Logo } from "@/shared/ui";
import { fmtDateTime, fmtTime } from "@/shared/lib/format";
import { errorMessage } from "@/shared/api";
import {
  useApproveDeviceRequest,
  useDenyDeviceRequest,
  useDeviceRequest,
  type ApiDeviceRequestStatus,
} from "@/entities/agent";
import { AccountMenu } from "@/entities/user";

const PATH = "/connect/device";

const OUTCOME: Record<
  Exclude<ApiDeviceRequestStatus, "PENDING">,
  { tone: "success" | "neutral"; label: string; text: string }
> = {
  APPROVED: { tone: "success", label: "승인됨", text: "터미널로 돌아가세요. 곧 연결이 끝납니다." },
  CONSUMED: { tone: "success", label: "연결됨", text: "터미널에서 연결이 끝났습니다." },
  DENIED: { tone: "neutral", label: "거부됨", text: "이 요청으로는 연결되지 않습니다." },
  EXPIRED: { tone: "neutral", label: "만료됨", text: "코드가 만료됐습니다. 터미널에서 다시 실행해 주세요." },
};

/** 대소문자·하이픈·공백을 무시하고 영문 8글자면 "XXXX-XXXX"로 맞춘다 */
function normalizeUserCode(raw: string | undefined): string | null {
  const letters = (raw ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return letters.length === 8 ? `${letters.slice(0, 4)}-${letters.slice(4)}` : null;
}

export function ConnectDeviceView({ code }: { code?: string }) {
  const userCode = normalizeUserCode(code);

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <AccountMenu />
      </header>
      <main className="mx-auto max-w-[560px] px-4 pb-16 pt-4 sm:px-6">
        <div className="card p-6 sm:p-8 animate-rise">
          <h1 className="text-[22px] font-semibold tracking-tight">에이전트 연결 승인</h1>
          {userCode ? <RequestPanel userCode={userCode} /> : <CodeForm initial={code} />}
        </div>
      </main>
    </div>
  );
}

function CodeForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [invalid, setInvalid] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const userCode = normalizeUserCode(value);
    if (!userCode) {
      setInvalid(true);
      return;
    }
    router.replace(`${PATH}?code=${userCode}`);
  };

  return (
    <>
      <p className="mt-1 text-[13.5px] text-ink-500">터미널에서 로그인을 실행하면 나오는 8글자 코드를 입력하세요.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Input
          label="연결 코드"
          name="code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          className="font-mono uppercase tracking-widest"
          required
        />
        {invalid && <p className="text-[12.5px] text-forbidden">코드는 영문 8글자입니다 (예: WDJB-MJHT).</p>}
        <Button type="submit" size="lg" className="w-full">
          다음
        </Button>
      </form>
    </>
  );
}

function RequestPanel({ userCode }: { userCode: string }) {
  const router = useRouter();
  const request = useDeviceRequest(userCode);
  const approve = useApproveDeviceRequest();
  const deny = useDenyDeviceRequest();
  const busy = approve.isPending || deny.isPending;
  const decideError = approve.error ?? deny.error;
  const enterAnother = (
    <Button variant="outline" onClick={() => router.replace(PATH)}>
      다른 코드 입력
    </Button>
  );

  if (request.isPending) return <p className="mt-6 text-[13px] text-ink-500">불러오는 중…</p>;

  if (request.isError) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-[13.5px] text-forbidden">{errorMessage(request.error)}</p>
        {enterAnother}
      </div>
    );
  }

  const r = request.data;

  if (r.status !== "PENDING") {
    const outcome = OUTCOME[r.status];
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Badge tone={outcome.tone}>{outcome.label}</Badge>
          <span className="font-mono text-[13px] text-ink-500">{r.userCode}</span>
        </div>
        <p className="text-[13.5px] text-ink-700">{outcome.text}</p>
        {outcome.tone === "success" ? <Button href="/connect">에이전트 연결 화면으로</Button> : enterAnother}
      </div>
    );
  }

  return (
    <>
      <p className="mt-1 text-[13.5px] text-ink-500">
        아래 코드가 <b>터미널에 보이는 코드와 같은지</b> 확인하세요.
      </p>
      <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 py-4 text-center font-mono text-[28px] font-semibold tracking-[0.2em] text-ink-900">
        {r.userCode}
      </div>

      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
        <dt className="text-ink-500">에이전트 이름</dt>
        <dd className="truncate font-medium text-ink-900">{r.agentName}</dd>
        <dt className="text-ink-500">CLI</dt>
        <dd className="text-ink-900">{r.harness}</dd>
        <dt className="text-ink-500">요청 IP</dt>
        <dd className="font-mono text-ink-900">{r.clientIp ?? "알 수 없음"}</dd>
        <dt className="text-ink-500">요청 시각</dt>
        <dd className="text-ink-900">{fmtDateTime(r.requestedAt)}</dd>
        <dt className="text-ink-500">유효 기간</dt>
        <dd className="text-ink-900">{fmtTime(r.expiresAt)}까지</dd>
      </dl>

      <div className="mt-5 flex gap-2.5 rounded-xl bg-human-bg p-3 text-[13px] text-ink-700">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-human" />
        <p>
          방금 <b>내 터미널에서 직접 실행한 경우에만</b> 승인하세요. 다른 사람이 보낸 링크를 승인하면 그 사람의 컴퓨터가
          내 이름으로 작업하게 됩니다.
        </p>
      </div>

      {decideError && <p className="mt-3 text-[12.5px] text-forbidden">{errorMessage(decideError)}</p>}

      <div className="mt-6 flex gap-2">
        <Button size="lg" className="flex-1" onClick={() => approve.mutate(userCode)} disabled={busy}>
          {approve.isPending ? "승인 중…" : "승인"}
        </Button>
        <Button size="lg" variant="outline" onClick={() => deny.mutate(userCode)} disabled={busy}>
          {deny.isPending ? "거부 중…" : "거부"}
        </Button>
      </div>
    </>
  );
}
