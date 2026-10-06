import { AuthGate } from "@/widgets/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
