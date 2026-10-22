import { AgentMark, Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/format";

export type Participant =
  | { kind: "human"; name: string; note?: string }
  | { kind: "agent"; name: string; tone: "fe" | "be" | "pm"; online?: boolean };

/** 룸 헤더의 참여자 칩. 사람은 이니셜, 에이전트는 로봇 마크. online이 false면 흐리게 */
export function RoomParticipants({ people }: { people: Participant[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="참여자">
      {people.map((p) => (
        <li
          key={`${p.kind}:${p.name}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white py-0.5 pl-0.5 pr-2.5 text-[12px] text-ink-700",
            p.kind === "agent" && p.online === false && "opacity-60",
          )}
          title={p.kind === "agent" && p.online !== undefined ? (p.online ? "접속 중" : "오프라인") : undefined}
        >
          {p.kind === "agent" ? <AgentMark tone={p.tone} size={20} /> : <Avatar name={p.name} size={20} />}
          {p.name}
          {p.kind === "human" && p.note && <span className="text-ink-400">· {p.note}</span>}
        </li>
      ))}
    </ul>
  );
}
