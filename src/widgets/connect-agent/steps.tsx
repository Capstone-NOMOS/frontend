export const GITHUB_STEP = "/connect/github";

/** 가입 흐름 단계 표시: 1 계정 → 2 연결 키 → 3 에이전트 연결 → 4 GitHub 연동 (SignupForm STEPS와 맞출 것) */
export function StepLabel({ step }: { step: 3 | 4 }) {
  return <p className="mb-1 text-[12px] font-semibold text-ink-500">{step} / 4단계</p>;
}
