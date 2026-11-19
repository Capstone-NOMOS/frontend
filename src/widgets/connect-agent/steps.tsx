"use client";

import { useCurrentUser } from "@/entities/user";

export const GITHUB_STEP = "/connect/github";

/**
 * 가입 흐름 단계 표시: 1 계정 → 2 에이전트 연결 → 3 GitHub 연동 (SignupForm STEPS와 맞출 것).
 * 마지막 단계(GitHub 연동)를 마친 사용자가 재연결하러 온 것이면 보이지 않는다
 */
export function StepLabel({ step }: { step: 2 | 3 }) {
  const { me } = useCurrentUser();
  if (me?.githubLogin) return null;
  return <p className="mb-1 text-[12px] font-semibold text-ink-500">{step} / 3단계</p>;
}
