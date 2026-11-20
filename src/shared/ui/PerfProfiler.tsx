"use client";

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  const w = window as unknown as { __perf?: object[] };
  (w.__perf ??= []).push({ id, phase, actualDuration, baseDuration, startTime, commitTime });
};

/**
 * 성능 측정용 (docs/perf-room-feed.md). NEXT_PUBLIC_PERF=1로 띄웠을 때만 커밋 시간을 window.__perf에 쌓는다.
 * 평소에는 children을 그대로 돌려준다
 */
export function PerfProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_PERF !== "1") return children;
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
