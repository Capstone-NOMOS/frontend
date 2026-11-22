"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Button, EmptyState } from "@/shared/ui";
import { useOrgAgents } from "@/entities/agent";
import { EventRow, makeEventLookup, useProjectEvents } from "@/entities/event";
import { useOrgMembers } from "@/entities/org";
import { useTasks } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

export function ActivityView({ projectId }: { projectId: string }) {
  // ref가 아니라 state다 — 스크롤 요소가 붙은 뒤에 목록이 한 번 더 그려져야 가상화가 그 요소를 잡는다
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  return (
    // 스크롤 위치는 가상화가 직접 잡는다 — 브라우저의 보정(overflow-anchor)과 겹치지 않게 끈다
    <div ref={setScroller} className="no-scrollbar h-full overflow-y-auto [overflow-anchor:none]">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">활동</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          프로젝트에서 일어난 일입니다. 에이전트가 남긴 인계 노트는 문서(MCP) › 인계 노트에 있습니다.
        </p>
        <Events projectId={projectId} scroller={scroller} />
      </div>
    </div>
  );
}

// 한 줄짜리 이벤트의 높이(px). 실제 높이는 그려진 뒤에 잰다
const ROW_HEIGHT = 37;

/**
 * 이벤트 로그 (최신순). 지워지지 않는 기록이라 그대로 보여 준다.
 * 화면에 걸린 줄만 그린다 (docs/adr/0021). 나머지는 목록의 위아래 여백으로 자리만 잡는다
 */
function Events({ projectId, scroller }: { projectId: string; scroller: HTMLDivElement | null }) {
  const me = useCurrentUser().me!;
  const events = useProjectEvents(projectId);
  const tasks = useTasks(projectId).data;
  const agents = useOrgAgents(me.orgId).data?.agents;
  const orgMembers = useOrgMembers(me.orgId!);
  const members = orgMembers.data;
  // 줄(EventRow)이 memo라 lookup이 매번 새 객체면 소용이 없다
  const lookup = useMemo(() => makeEventLookup(tasks, agents, members), [tasks, agents, members]);
  const list = useMemo(() => events.data ?? [], [events.data]);
  // 이 함수가 바뀌면 가상화가 모든 줄의 위치를 다시 계산한다 — 목록이 바뀔 때만 새로 만든다
  const keyOf = useCallback((i: number) => list[i].id, [list]);

  // 목록이 스크롤 영역 안에서 시작하는 위치 (위의 제목 · 설명 높이)
  const listRef = useRef<HTMLOListElement>(null);
  const [listTop, setListTop] = useState(0);
  // 목록 첫 줄이 화면 위로 지나갔는가. 그때만 새 이벤트가 끼어들어도 보던 줄을 제자리에 둔다
  const [pastTop, setPastTop] = useState(false);
  // React Compiler를 쓰지 않는다 — 이 훅이 돌려주는 함수가 메모이즈될 일이 없다
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => scroller,
    getItemKey: keyOf,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    scrollMargin: listTop,
    anchorTo: pastTop ? "end" : "start",
    onChange: (v) => setPastTop((v.scrollOffset ?? 0) > listTop),
  });
  // 창 폭이 바뀌면 설명 줄 수가 달라진다 — 그릴 때마다 다시 잰다 (값이 같으면 다시 그리지 않는다)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const ol = listRef.current;
    if (!ol || !scroller) return;
    setListTop(Math.round(ol.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop));
  });
  const rows = virtualizer.getVirtualItems();

  // 멤버 목록 없이 그리면 이름 자리에 "사람"이 잠깐 보인다
  if (events.isPending || orgMembers.isPending) {
    return (
      <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
        <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
      </div>
    );
  }
  if (events.isError) return <EmptyState title={errorMessage(events.error)} />;

  return (
    <section className="mt-6">
      <ol
        ref={listRef}
        className="card divide-y divide-ink-100 px-4"
        style={
          rows.length > 0
            ? {
                paddingTop: rows[0].start - listTop,
                paddingBottom: virtualizer.getTotalSize() - (rows.at(-1)!.end - listTop),
              }
            : undefined
        }
      >
        {rows.map((row) => (
          <EventRow
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            event={list[row.index]}
            lookup={lookup}
          />
        ))}
        {list.length === 0 && <li className="py-8 text-center text-[13px] text-ink-500">아직 활동이 없습니다</li>}
      </ol>
      {events.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={events.isFetchingNextPage}
            onClick={() => void events.fetchNextPage()}
          >
            {events.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </Button>
        </div>
      )}
    </section>
  );
}
