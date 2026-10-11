import { RoleRoomView, RoomView } from "@/widgets/room";
import { roleOfRoomSlug } from "@/entities/room";

// frontend·backend는 역할 룸(API). 그 밖의 id는 목업 Room이다
export default async function RoomPage({ params }: { params: Promise<{ projectId: string; roomId: string }> }) {
  const { projectId, roomId } = await params;
  const role = roleOfRoomSlug(roomId);
  if (role) return <RoleRoomView projectId={projectId} role={role} />;
  return <RoomView projectId={projectId} roomId={roomId} />;
}
