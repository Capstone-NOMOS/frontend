import { PmRoomView } from "@/widgets/pm-room";

// Room 3(대표 + PM). [roomId] 목업 Room보다 이 정적 경로가 먼저 잡힌다
export default async function OwnerRoomPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <PmRoomView projectId={projectId} />;
}
