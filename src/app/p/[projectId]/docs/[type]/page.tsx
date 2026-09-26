import { DocsView } from "@/components/docs/DocsView";

export default async function DocPage({ params }: { params: Promise<{ projectId: string; type: string }> }) {
  const { projectId, type } = await params;
  return <DocsView projectId={projectId} slug={type} />;
}
