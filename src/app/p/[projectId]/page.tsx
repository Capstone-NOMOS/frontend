import { DashboardView } from "@/widgets/dashboard";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <DashboardView projectId={projectId} />;
}
