"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCurrentUser } from "../model/session";

/** 로고 링크. 로그인했으면 랜딩을 거치지 않고 프로젝트 목록으로 간다 (확인 중에도 목록 — 로그아웃 상태면 AuthGate가 돌려보낸다) */
export function HomeLink({ children }: { children: ReactNode }) {
  const { status } = useCurrentUser();
  return (
    <Link href={status === "anonymous" ? "/" : "/projects"} aria-label="NOMOS 홈">
      {children}
    </Link>
  );
}
