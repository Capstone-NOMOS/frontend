export const GITHUB_STEP = "/connect/github";

/** 온보딩 단계 표시: 1 에이전트 연결 → 2 GitHub 연동 */
export function StepLabel({ step }: { step: 1 | 2 }) {
  return <p className="mb-1 text-[12px] font-semibold text-ink-500">{step} / 2단계</p>;
}
