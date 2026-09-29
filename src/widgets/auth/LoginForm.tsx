"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
import { useLogin } from "@/entities/user";
import { safeNext } from "./safeNext";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const login = useLogin();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const target = safeNext(next);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) return;
    // 401 INVALID_CREDENTIALS는 아이디·비밀번호 중 어느 쪽인지 구분하지 않는다
    login.mutate({ loginId: loginId.trim(), password }, { onSuccess: () => router.replace(target ?? "/") });
  };

  return (
    <div className="w-full max-w-[420px] animate-rise">
      <div className="card p-6 sm:p-8">
        <h1 className="text-[22px] font-semibold tracking-tight">로그인</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">
          로그인은 24시간 유지됩니다. 브라우저 탭을 닫으면 다시 로그인해야 합니다.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input
            label="아이디"
            name="loginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="비밀번호"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          {login.isError && <p className="text-[12.5px] text-forbidden">{errorMessage(login.error)}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
            {login.isPending ? "로그인 중…" : "로그인"}
          </Button>
        </form>
        <div className="mt-5 text-center text-[13px] text-ink-500">
          계정이 없나요?{" "}
          <Link
            href={target ? `/signup?next=${encodeURIComponent(target)}` : "/signup"}
            className="font-medium text-ink-900 underline-offset-2 hover:underline"
          >
            가입하고 연결 키 받기
          </Link>
        </div>
      </div>
    </div>
  );
}
