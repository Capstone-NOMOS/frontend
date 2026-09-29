"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Button } from "@/shared/ui";
import { useCurrentUser } from "@/entities/user";
import { SessionExpiryBanner } from "./SessionExpiryBanner";

// 조직이 없어도 들어갈 수 있는 보호 경로
const ORG_OPTIONAL = ["/onboarding", "/connect"];

/**
 * 로그인이 필요한 라우트의 layout에서 감싼다. 권한의 최종 판정은 API의 401·403이다 (adr/0007).
 * 판정이 끝나기 전에는 보호된 화면을 한 프레임도 그리지 않는다.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, me, error, retry } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  let redirect: string | null = null;
  if (status === "anonymous") redirect = "/login";
  else if (me && !me.orgId && !ORG_OPTIONAL.some((p) => pathname.startsWith(p))) redirect = "/onboarding";
  else if (me?.orgId && pathname.startsWith("/onboarding")) redirect = "/projects";

  useEffect(() => {
    if (redirect === "/login") {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    } else if (redirect) {
      router.replace(redirect);
    }
  }, [redirect, router]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-[14px] text-ink-700">{errorMessage(error)}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (status !== "authenticated" || redirect) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-400" aria-busy="true">
        <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
      </div>
    );
  }

  return (
    <>
      <SessionExpiryBanner />
      {children}
    </>
  );
}
