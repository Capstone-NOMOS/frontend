import { AuthGate } from "@/widgets/auth";
import { SettingsFrame } from "@/widgets/settings-frame";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SettingsFrame>{children}</SettingsFrame>
    </AuthGate>
  );
}
