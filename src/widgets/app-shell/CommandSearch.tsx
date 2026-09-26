"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, MessageSquare, Search, SquareKanban } from "lucide-react";
import { cn } from "@/shared/lib/format";
import { ROOM_META } from "@/entities/room";
import { TaskBadge } from "@/entities/task";
import { useProject } from "@/lib/store";

type Item = { id: string; label: string; sub?: string; href: string; icon: React.ReactNode; extra?: React.ReactNode };

export function CommandSearch({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const router = useRouter();
  const { visibleRooms, tasks, docs } = useProject(projectId);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const items = useMemo<Item[]>(() => {
    const base = `/p/${projectId}`;
    const rooms: Item[] = visibleRooms.map((r) => ({ id: r.id, label: ROOM_META[r.type].name, sub: ROOM_META[r.type].who, href: `${base}/rooms/${r.id}`, icon: <MessageSquare size={15} /> }));
    const latest = new Map<string, (typeof docs)[number]>();
    for (const d of docs) if (!latest.has(d.type) || latest.get(d.type)!.version < d.version) latest.set(d.type, d);
    const docItems: Item[] = [...latest.values()].map((d) => ({ id: d.id, label: `${{ CONSTITUTION: "헌법", SPEC: "명세", CONTRACT: "계약", ADR: "결정기록" }[d.type]} · ${d.title}`, sub: `v${d.version}`, href: `${base}/docs/${d.type.toLowerCase()}`, icon: <FileText size={15} /> }));
    const taskItems: Item[] = tasks.map((t) => ({ id: t.id, label: `${t.id} ${t.title}`, sub: `${t.role} · ${t.featureId}`, href: `${base}#${t.id}`, icon: <SquareKanban size={15} />, extra: <TaskBadge state={t.state} /> }));
    const all = [...rooms, ...taskItems, ...docItems];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => `${i.label} ${i.sub ?? ""}`.toLowerCase().includes(s)) : all;
  }, [q, projectId, visibleRooms, tasks, docs]);

  const go = (item: Item) => {
    router.push(item.href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink-900/30 p-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-ink-100 px-4">
          <Search size={17} className="text-ink-400" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && items[idx]) go(items[idx]);
            }}
            placeholder="Room, 태스크, 문서 검색…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded-md border border-ink-200 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-500">결과가 없습니다</li>}
          {items.map((item, i) => (
            <li key={item.id}>
              <button onMouseEnter={() => setIdx(i)} onClick={() => go(item)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === idx ? "bg-ink-100" : "hover:bg-ink-50")}>
                <span className="text-ink-500">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{item.label}</span>
                  {item.sub && <span className="block truncate text-xs text-ink-500">{item.sub}</span>}
                </span>
                {item.extra}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
