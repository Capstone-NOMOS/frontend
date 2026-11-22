import { expect, test } from "vitest";
import { fmtDate, fmtTime } from "./format";

// 포매터를 재사용하게 바꾼 뒤에도 문자열이 그대로인가 (docs/perf-activity.md)
test("fmtTime · fmtDate는 toLocale*String과 같은 문자열을 낸다", () => {
  for (const iso of ["2026-01-01T00:00:00.000Z", "2026-06-15T03:07:00.000Z", "2026-11-22T14:59:59.000Z"]) {
    const d = new Date(iso);
    expect(fmtTime(iso)).toBe(d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    expect(fmtDate(iso)).toBe(d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }));
  }
});
