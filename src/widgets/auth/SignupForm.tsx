"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, KeyRound } from "lucide-react";
import { Button, CopyField, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/format";
import type { User } from "@/entities/user";
import { useApp } from "@/lib/store";

const STEPS = ["계정", "신원 키", "에이전트 연결"];

export function SignupForm() {
  const { actions, state } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", nickname: "" });
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const step = user ? 1 : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password || !form.nickname.trim()) return setError("모든 항목을 입력해주세요.");
    if (state.users.some((u) => u.username === form.username.trim())) return setError("이미 사용 중인 아이디입니다.");
    setError(null);
    setUser(actions.signup({ username: form.username, nickname: form.nickname }));
  };

  return (
    <div className="w-full max-w-[460px] animate-rise">
      <ol className="mb-4 flex items-center gap-2 text-[12px]">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold", i < step ? "bg-auto text-white" : i === step ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-500")}>{i < step ? <Check size={11} /> : i + 1}</span>
            <span className={cn(i === step ? "font-medium text-ink-900" : "text-ink-500")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-ink-200" />}
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-8">
        {step === 0 ? (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight">계정 만들기</h1>
            <p className="mt-1 text-[13.5px] text-ink-500">자체 계정입니다 (GitHub OAuth 아님). 가입하면 서버가 사용자 키페어(Ed25519)를 만들어 공개키를 신원으로 씁니다.</p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <Input label="아이디" name="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="영문·숫자" autoComplete="username" />
              <Input label="비밀번호" name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8자 이상" autoComplete="new-password" />
              <Input label="닉네임" name="nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="팀원에게 보이는 이름" />
              {error && <p className="text-[12.5px] text-forbidden">{error}</p>}
              <Button type="submit" size="lg" className="w-full">
                가입하고 키 발급받기 <ArrowRight size={16} />
              </Button>
            </form>
            <div className="mt-5 text-center text-[13px] text-ink-500">
              이미 계정이 있나요? <Link href="/login" className="font-medium text-ink-900 underline-offset-2 hover:underline">로그인</Link>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-auto-bg text-auto"><KeyRound size={20} /></div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-tight">신원 키가 발급됐습니다</h1>
            <p className="mt-1 text-[13.5px] text-ink-500">
              {user!.nickname} 님의 공개키입니다. 비밀키는 브릿지(로컬)에만 저장되며 서버는 공개키만 보관합니다. 키는 사용자당 1개이고 프로젝트마다 바뀌지 않습니다.
            </p>
            <div className="mt-5 space-y-2">
              <CopyField label="공개키 (신원)" value={user!.pubkey} />
              <CopyField label="아이디" value={`@${user!.username}`} />
            </div>
            <div className="mt-6 rounded-xl bg-ink-50 p-4 text-[13px] text-ink-700">
              <div className="font-semibold">다음: 에이전트 연결</div>
              <div className="mt-1 text-ink-500">노트북에서 브릿지를 설치하고 내 Claude Code를 NOMOS에 연결합니다. 프로젝트에 참여하기 전까지 에이전트는 어떤 태스크도 받지 않습니다.</div>
            </div>
            <Button size="lg" className="mt-5 w-full" onClick={() => router.push("/connect")}>
              에이전트 연결하기 <ArrowRight size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
