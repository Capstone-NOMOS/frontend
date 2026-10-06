"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, KeyRound } from "lucide-react";
import { Button, CopyField, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/format";
import { ApiError, errorMessage } from "@/shared/api";
import { useLogin, useSignup } from "@/entities/user";
import { safeNext } from "./safeNext";

const STEPS = ["계정", "연결 키", "에이전트 연결"];

function validate({ loginId, password, nickname }: { loginId: string; password: string; nickname: string }) {
  if (loginId.length < 3 || loginId.length > 64) return "아이디는 3~64자로 입력해 주세요.";
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!nickname) return "닉네임을 입력해 주세요.";
  return null;
}

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const signup = useSignup();
  const login = useLogin();
  const [form, setForm] = useState({ loginId: "", password: "", nickname: "" });
  const [idError, setIdError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectKey, setConnectKey] = useState<string | null>(null);
  const [loginFailed, setLoginFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = signup.isPending || login.isPending;
  const step = connectKey ? 1 : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { loginId: form.loginId.trim(), password: form.password, nickname: form.nickname.trim() };
    const invalid = validate(body);
    setIdError(null);
    setError(invalid);
    if (invalid) return;

    try {
      const res = await signup.mutateAsync(body);
      // 연결 키는 이 응답에서 한 번만 나온다. 로그인이 실패해도 먼저 보여준다
      setConnectKey(res.connectKey);
    } catch (err) {
      if (err instanceof ApiError && err.code === "LOGIN_ID_TAKEN") setIdError(errorMessage(err));
      else setError(errorMessage(err));
      return;
    }
    // 가입 응답에는 토큰이 없다 → 같은 자격으로 바로 로그인
    login.mutate({ loginId: body.loginId, password: body.password }, { onError: () => setLoginFailed(true) });
  };

  return (
    <div className="w-full max-w-[460px] animate-rise">
      <ol className="mb-4 flex items-center gap-2 text-[12px]">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                i < step ? "bg-auto text-white" : i === step ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-500",
              )}
            >
              {i < step ? <Check size={11} /> : i + 1}
            </span>
            <span className={cn(i === step ? "font-medium text-ink-900" : "text-ink-500")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-ink-200" />}
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-8">
        {!connectKey ? (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight">계정 만들기</h1>
            <p className="mt-1 text-[13.5px] text-ink-500">
              가입하면 내 에이전트(CLI)를 NOMOS에 연결할 때 쓰는 연결 키가 발급됩니다.
            </p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <Input
                  label="아이디"
                  name="loginId"
                  value={form.loginId}
                  onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                  placeholder="3~64자"
                  autoComplete="username"
                  maxLength={64}
                  aria-invalid={Boolean(idError)}
                />
                {idError && <p className="mt-1.5 text-[12.5px] text-forbidden">{idError}</p>}
              </div>
              <Input
                label="비밀번호"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="8자 이상"
                autoComplete="new-password"
              />
              <Input
                label="닉네임"
                name="nickname"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="팀원에게 보이는 이름"
              />
              {error && <p className="text-[12.5px] text-forbidden">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? "가입 중…" : "가입하고 연결 키 받기"} <ArrowRight size={16} />
              </Button>
            </form>
            <div className="mt-5 text-center text-[13px] text-ink-500">
              이미 계정이 있나요?{" "}
              <Link href="/login" className="font-medium text-ink-900 underline-offset-2 hover:underline">
                로그인
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-auto-bg text-auto">
              <KeyRound size={20} />
            </div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-tight">연결 키가 발급됐습니다</h1>
            <p className="mt-1 text-[13.5px] text-ink-500">
              내 에이전트(CLI)를 NOMOS에 연결할 때 이 키를 붙여넣습니다.
            </p>
            <div className="mt-5">
              <CopyField label="연결 키" value={connectKey} />
            </div>
            <p className="mt-3 rounded-xl bg-human-bg px-4 py-3 text-[13px] font-medium text-human">
              이 화면을 떠나면 다시 볼 수 없습니다. 잃어버리면 재발급해야 합니다.
            </p>
            {loginFailed && (
              <p className="mt-3 text-[12.5px] text-forbidden">
                자동 로그인에 실패했습니다. 다음 단계에서 다시 로그인해 주세요.
              </p>
            )}
            <label className="mt-5 flex items-center gap-2 text-[13.5px] text-ink-700">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              안전한 곳에 저장했습니다
            </label>
            <Button
              size="lg"
              className="mt-5 w-full"
              disabled={!saved || login.isPending}
              onClick={() => router.push(safeNext(next) ?? "/connect")}
            >
              다음 <ArrowRight size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
