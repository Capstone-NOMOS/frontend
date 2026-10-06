import { SignupForm } from "@/widgets/auth";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <SignupForm next={typeof next === "string" ? next : undefined} />;
}
