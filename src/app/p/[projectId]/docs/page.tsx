import { redirect } from "next/navigation";

export default async function DocsIndex({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/docs/spec`);
}
