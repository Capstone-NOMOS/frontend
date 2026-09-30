import { TaskDetailView } from "@/widgets/task-detail";

export default async function TaskPage({ params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  const { projectId, taskId } = await params;
  return <TaskDetailView projectId={projectId} taskId={taskId} />;
}
