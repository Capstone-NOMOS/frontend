"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "@/shared/api";

const WARN_BEFORE_MS = 5 * 60 * 1000;

/** refresh가 없으므로(adr/0007) 만료 5분 전에 알리고, 만료되면 로그인으로 보낸다 */
export function SessionExpiryBanner() {
  const [warn, setWarn] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const left = session.expiresAt - Date.now();
    const warnTimer = window.setTimeout(() => setWarn(true), Math.max(0, left - WARN_BEFORE_MS));
    const expireTimer = window.setTimeout(() => {
      clearSession();
      queryClient.clear();
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }, left);
    return () => {
      window.clearTimeout(warnTimer);
      window.clearTimeout(expireTimer);
    };
  }, [queryClient, router]);

  if (!warn) return null;
  return (
    <div role="status" className="bg-human-bg px-4 py-2 text-center text-[13px] font-medium text-human">
      5분 후 로그아웃됩니다. 다시 로그인하면 계속할 수 있습니다
    </div>
  );
}
