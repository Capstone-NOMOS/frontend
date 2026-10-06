import { Badge } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import type { Schemas } from "@/shared/api";
import { NOTE_KIND } from "../model/api";

/**
 * notes: 같은 목록 전체. 정정 관계(supersedes)를 찾는 데 쓴다.
 * 정정된 원본도 지우지 않고 "정정됨"으로 남긴다
 */
export function NoteItem({ note, notes }: { note: Schemas["Note"]; notes: Schemas["Note"][] }) {
  const kind = NOTE_KIND[note.kind];
  const corrected = notes.some((n) => n.supersedes === note.id);
  const original = note.supersedes ? notes.find((n) => n.id === note.supersedes) : undefined;
  // 결정 사항은 프로젝트의 모든 태스크에 전달된다 (BE #26 §4) — 다른 노트와 구분되게 강조한다
  const decided = note.kind === "DECIDED";
  return (
    <div
      className={cn(
        decided && "-mx-2 rounded-lg border-l-2 border-brand-500 bg-brand-50 px-2 py-1.5",
        corrected && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11.5px] text-ink-400">#{note.seq}</span>
        <Badge tone={kind.tone}>{kind.label}</Badge>
        {decided && !corrected && <span className="text-[11.5px] text-brand-600">모든 태스크에 전달됨</span>}
        {corrected && <Badge>정정됨</Badge>}
        {note.supersedes && (
          <span className="text-[11.5px] text-ink-500">{original ? `#${original.seq} 정정` : "이전 노트 정정"}</span>
        )}
        <span className="ml-auto text-[11.5px] text-ink-400 tabular-nums">{fmtDateTime(note.createdAt)}</span>
      </div>
      <p className={corrected ? "mt-1 text-[13.5px] font-medium line-through" : "mt-1 text-[13.5px] font-medium"}>
        {note.headline}
      </p>
      {note.keyPoints.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] text-ink-600">
          {note.keyPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {note.affects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {note.affects.map((a) => (
            <code key={a} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-600">
              {a}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
