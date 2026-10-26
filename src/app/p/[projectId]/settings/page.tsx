import { TabLinks } from "@/shared/ui";
import { AccountSettingsView } from "@/widgets/account-settings";
import { OrgView } from "@/widgets/org";
import { SettingsView } from "@/widgets/settings";

const TABS = [
  { tab: "project", label: "프로젝트" },
  { tab: "org", label: "조직" },
  { tab: "account", label: "계정" },
] as const;

/** 설정을 한 곳에 모은다. 탭은 ?tab=으로 주소에 남아 뒤로가기로 돌아올 수 있다 */
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const { tab } = await searchParams;
  const current = TABS.find((t) => t.tab === tab)?.tab ?? "project";
  const base = `/p/${projectId}/settings`;

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <TabLinks
          tabs={TABS.map((t) => ({
            href: t.tab === "project" ? base : `${base}?tab=${t.tab}`,
            label: t.label,
            active: t.tab === current,
          }))}
        />
        {current === "org" ? (
          <OrgView />
        ) : current === "account" ? (
          <AccountSettingsView />
        ) : (
          <SettingsView projectId={projectId} />
        )}
      </div>
    </div>
  );
}
