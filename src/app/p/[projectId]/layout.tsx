import { AppShell } from "@/widgets/app-shell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <AppShell projectId={projectId}>{children}</AppShell>;
}
