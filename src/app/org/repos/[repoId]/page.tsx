import { RepoPathsView } from "@/widgets/repo-paths";

export default async function RepoPathsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const { repoId } = await params;
  return <RepoPathsView repoId={repoId} />;
}
