import { RoutingReportView } from "@/widgets/eval";

export default async function EvalPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <RoutingReportView projectId={projectId} />;
}
