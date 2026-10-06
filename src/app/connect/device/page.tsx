import { ConnectDeviceView } from "@/widgets/connect-device";

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  return <ConnectDeviceView code={typeof code === "string" ? code : undefined} />;
}
