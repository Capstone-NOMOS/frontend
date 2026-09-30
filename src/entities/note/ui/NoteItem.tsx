import { Badge } from "@/shared/ui";
import { fmtDateTime } from "@/shared/lib/format";
import { NOTE_KIND, type ApiNote } from "../model/api";

/**
 * notes: 같은 목록 전체. 정정 관계(supersedes)를 찾는 데 쓴다.
 * 정정된 원본도 지우지 않고 "정정됨"으로 남긴다
 */
export function NoteItem({ note, notes }: { note: ApiNote; notes: ApiNote[] }) {
  const kind = NOTE_KIND[note.kind];
  const corrected = notes.some((n) => n.supersedes === note.id);
  const original = note.supersedes ? notes.find((n) => n.id === note.supersedes) : undefined;
  return (
    <div className={corrected ? "opacity-60" : undefined}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11.5px] text-ink-400">#{note.seq}</span>
        <Badge tone={kind.tone}>{kind.label}</Badge>
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
