import { AppShell } from "@/widgets/app-shell";
import { AuthGate } from "@/widgets/auth";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <AuthGate>
      <AppShell projectId={projectId}>{children}</AppShell>
    </AuthGate>
  );
}
