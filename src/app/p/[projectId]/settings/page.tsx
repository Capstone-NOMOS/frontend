import { SettingsView } from "@/widgets/settings";

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SettingsView projectId={projectId} />;
}
