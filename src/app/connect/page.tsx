import { safeNext } from "@/widgets/auth";
import { ConnectAgentView } from "@/widgets/connect-agent";

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Promise<{ joined?: Param; next?: Param }> }) {
  const { joined, next } = await searchParams;
  // 설정에서 들어오면 next로 돌아간다. 같은 사이트 경로만 받는다
  return <ConnectAgentView joined={first(joined) === "1"} returnTo={safeNext(first(next)) ?? undefined} />;
}
