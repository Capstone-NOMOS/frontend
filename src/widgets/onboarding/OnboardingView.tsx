"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button, Input, Logo } from "@/shared/ui";
import { ApiError, errorMessage } from "@/shared/api";
import { AccountMenu } from "@/entities/user";
import { useCreateOrg } from "@/entities/org";

/** 조직이 없는 사용자가 오는 곳. 성공하면 me가 갱신되고 AuthGate가 /projects로 보낸다 */
export function OnboardingView() {
  const createOrg = useCreateOrg();
  const [name, setName] = useState("");
  // ALREADY_IN_ORG는 에러가 아니다 — me를 다시 불러 라우팅에 맡긴다
  const error =
    createOrg.error instanceof ApiError && createOrg.error.code === "ALREADY_IN_ORG" ? null : createOrg.error;

  return (
    <div className="flex min-h-dvh flex-col dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <AccountMenu />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[460px] animate-rise">
          <div className="card p-6 sm:p-8">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Building2 size={20} />
            </div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-tight">조직 만들기</h1>
            <p className="mt-1 text-[13.5px] text-ink-500">
              조직을 만들면 내가 대표가 됩니다. 한 사람은 하나의 조직에만 속할 수 있습니다.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) createOrg.mutate({ name: name.trim() });
              }}
            >
              <Input
                label="조직 이름"
                name="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={128}
                required
              />
              {error && <p className="text-[12.5px] text-forbidden">{errorMessage(error)}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={createOrg.isPending || !name.trim()}>
                {createOrg.isPending ? "만드는 중…" : "조직 만들기"}
              </Button>
            </form>
          </div>
          <p className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white/70 p-4 text-[13px] text-ink-600">
            초대 링크를 받았다면 그 링크로 들어오세요. 초대를 수락하면 그 조직에 합류합니다.
          </p>
        </div>
      </main>
    </div>
  );
}
