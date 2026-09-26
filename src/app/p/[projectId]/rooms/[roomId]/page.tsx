import { RoomView } from "@/components/chat/RoomView";

export default async function RoomPage({ params }: { params: Promise<{ projectId: string; roomId: string }> }) {
  const { projectId, roomId } = await params;
  return <RoomView projectId={projectId} roomId={roomId} />;
}
