import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <DashboardView projectId={projectId} />;
}
