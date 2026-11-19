import { Button, EmptyState } from "@/shared/ui";
import { josa } from "@/shared/lib/format";
import { ROOM_META } from "../model/types";
import type { RoomType } from "../model/types";

/** 볼 수 없는 룸에 주소로 들어왔을 때. 대표 룸·역할 룸이 같은 화면을 쓴다 */
export function RoomForbidden({ projectId, type }: { projectId: string; type: RoomType }) {
  const meta = ROOM_META[type];
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        title="이 룸은 볼 수 없습니다"
        desc={`${josa(meta.name, "은/는")} ${meta.who}의 공간입니다. FE·BE는 자기 룸만 볼 수 있습니다.`}
        action={
          <Button href={`/p/${projectId}`} variant="outline">
            대시보드로
          </Button>
        }
      />
    </div>
  );
}
