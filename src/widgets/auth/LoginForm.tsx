"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Input } from "@/shared/ui";
import { RoleBadge } from "@/entities/user";
import { useApp } from "@/lib/store";

const DEMO = [
  { username: "caleb", name: "최영현", role: "OWNER" as const, hint: "Room 3 · 승인" },
  { username: "byoungguk", name: "전병국", role: "FE" as const, hint: "Room 1 · FE 에이전트" },
  { username: "yeonghun", name: "오영훈", role: "BE" as const, hint: "Room 2 · 질의 대기 중" },
];

export function LoginForm() {
  const { actions } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (u: string) => {
    const user = actions.login(u);
    if (!user) {
      setError("아이디를 찾을 수 없습니다. 데모 계정을 선택하거나 가입해주세요.");
      return;
    }
    let pending: string | null = null;
    try {
      pending = localStorage.getItem("nomos.pendingJoin");
    } catch {}
    router.push(pending ? `/join/${pending}` : "/projects");
  };

  return (
    <div className="w-full max-w-[420px] animate-rise">
      <div className="card p-6 sm:p-8">
        <h1 className="text-[22px] font-semibold tracking-tight">로그인</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">세션은 24시간 유효합니다. 브릿지도 같은 세션으로 WebSocket에 연결합니다.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            go(username);
          }}
        >
          <Input label="아이디" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="caleb" autoComplete="username" />
          <Input label="비밀번호" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          {error && <p className="text-[12.5px] text-forbidden">{error}</p>}
          <Button type="submit" size="lg" className="w-full">
            로그인
          </Button>
        </form>
        <div className="mt-5 text-center text-[13px] text-ink-500">
          계정이 없나요?{" "}
          <Link href="/signup" className="font-medium text-ink-900 underline-offset-2 hover:underline">
            가입하고 키 발급받기
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white/70 p-4">
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">데모 계정 (Jazzify 팀)</div>
        <ul className="space-y-1.5">
          {DEMO.map((d) => (
            <li key={d.username}>
              <button onClick={() => go(d.username)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-ink-50">
                <Avatar name={d.name} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                    {d.name} <RoleBadge role={d.role} />
                  </span>
                  <span className="block text-[11.5px] text-ink-500">@{d.username} · {d.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
