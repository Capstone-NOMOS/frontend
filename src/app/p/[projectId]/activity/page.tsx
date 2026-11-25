import { ActivityView } from "@/widgets/activity";
import { PerfProfiler } from "@/shared/ui";

export default async function ActivityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <PerfProfiler id="activity">
      <ActivityView projectId={projectId} />
    </PerfProfiler>
  );
}
