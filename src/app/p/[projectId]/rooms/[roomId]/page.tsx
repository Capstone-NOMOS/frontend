import { notFound } from "next/navigation";
import { RoleRoomView } from "@/widgets/room";
import { roleOfRoomSlug } from "@/entities/room";
import { PerfProfiler } from "@/shared/ui";

// 룸은 frontend·backend 둘뿐이다 (대표 룸은 rooms/owner). 그 밖의 값은 없는 주소다
export default async function RoomPage({ params }: { params: Promise<{ projectId: string; roomId: string }> }) {
  const { projectId, roomId } = await params;
  const role = roleOfRoomSlug(roomId);
  if (!role) notFound();
  return (
    <PerfProfiler id="room">
      <RoleRoomView projectId={projectId} role={role} />
    </PerfProfiler>
  );
}
