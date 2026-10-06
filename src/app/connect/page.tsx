import { ConnectAgentView } from "@/widgets/connect-agent";

export default async function Page({ searchParams }: { searchParams: Promise<{ joined?: string | string[] }> }) {
  const { joined } = await searchParams;
  return <ConnectAgentView joined={joined === "1"} />;
}
