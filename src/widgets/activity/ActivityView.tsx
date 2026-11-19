"use client";

import { Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Button, EmptyState } from "@/shared/ui";
import { useOrgAgents } from "@/entities/agent";
import { EventRow, makeEventLookup, useProjectEvents } from "@/entities/event";
import { useOrgMembers } from "@/entities/org";
import { useTasks } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

export function ActivityView({ projectId }: { projectId: string }) {
  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">활동</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          프로젝트에서 일어난 일입니다. 에이전트가 남긴 인계 노트는 문서(MCP) › 인계 노트에 있습니다.
        </p>
        <Events projectId={projectId} />
      </div>
    </div>
  );
}

/** 이벤트 로그 (최신순). 지워지지 않는 기록이라 그대로 보여 준다 */
function Events({ projectId }: { projectId: string }) {
  const me = useCurrentUser().me!;
  const events = useProjectEvents(projectId);
  const tasks = useTasks(projectId).data;
  const agents = useOrgAgents(me.orgId).data?.agents;
  const orgMembers = useOrgMembers(me.orgId!);
  const members = orgMembers.data;
  const lookup = makeEventLookup(tasks, agents, members);

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
      <ol className="card divide-y divide-ink-100 px-4">
        {events.data.map((e) => (
          <EventRow key={e.id} event={e} lookup={lookup} />
        ))}
        {events.data.length === 0 && (
          <li className="py-8 text-center text-[13px] text-ink-500">아직 활동이 없습니다</li>
        )}
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
