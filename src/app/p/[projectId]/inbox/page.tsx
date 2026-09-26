import { InboxView } from "@/components/inbox/InboxView";

export default async function InboxPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <InboxView projectId={projectId} />;
}
