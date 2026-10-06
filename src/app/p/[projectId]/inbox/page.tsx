import { InboxView } from "@/widgets/inbox";

export default async function InboxPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <InboxView projectId={projectId} />;
}
