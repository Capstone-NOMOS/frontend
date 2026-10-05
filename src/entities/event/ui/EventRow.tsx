import type { Schemas } from "@/shared/api";
import { cn, fmtDateTime, fmtTime, relTime } from "@/shared/lib/format";
import { describeEvent, eventActor, type EventLookup } from "../model/describe";

const DOT = { default: "bg-ink-300", success: "bg-auto", warn: "bg-human", danger: "bg-forbidden" } as const;

/** 이벤트 한 줄: 시각 · 색 점 · 누가 · 무엇을 */
export function EventRow({ event: e, lookup }: { event: Schemas["ProjectEvent"]; lookup: EventLookup }) {
  const { text, tone } = describeEvent(e, lookup);
  return (
    <li className="flex items-start gap-3 py-2 text-[13px]">
      <span
        className="w-11 shrink-0 pt-0.5 font-mono text-[11.5px] text-ink-400 tabular-nums"
        title={fmtDateTime(e.ts)}
      >
        {fmtTime(e.ts)}
      </span>
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{eventActor(e, lookup)}</span> <span className="text-ink-600">{text}</span>
      </span>
      <span className="hidden shrink-0 text-[11.5px] text-ink-400 sm:inline">{relTime(e.ts)}</span>
    </li>
  );
}
