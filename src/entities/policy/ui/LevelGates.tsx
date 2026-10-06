import type { Level } from "@/shared/model";
import { levelGates } from "../model/policy";

/** 레벨마다 사람 승인·PM 검토가 걸리는 행동. 나머지는 AUTO, 🔒 행(main 머지 등)은 항상 같다 */
export function LevelGates({ level }: { level: Level }) {
  const { human, review } = levelGates(level);
  return (
    <dl className="space-y-0.5 text-[12px] leading-5">
      <div className="flex gap-1.5">
        <dt className="shrink-0 font-medium text-human">사람</dt>
        <dd className="text-ink-700">{human.length > 0 ? human.join(" · ") : "없음"}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="shrink-0 font-medium text-review">PM 검토</dt>
        <dd className="text-ink-700">{review.length > 0 ? review.join(" · ") : "없음"}</dd>
      </div>
    </dl>
  );
}
