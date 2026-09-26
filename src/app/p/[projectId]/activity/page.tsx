import { ActivityView } from "@/components/activity/ActivityView";

export default async function ActivityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ActivityView projectId={projectId} />;
}
