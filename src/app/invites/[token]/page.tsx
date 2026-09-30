import type { Metadata } from "next";
import { fetchInvitePreview } from "@/entities/invite";
import { InviteView } from "@/widgets/invite";

// 링크 미리보기(메신저 카드) 제목. 인증 없는 API라 서버에서 불러도 된다 (adr/0007)
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const preview = await fetchInvitePreview(token).catch(() => null);
  return { title: preview?.valid ? `${preview.orgName}에 초대됐습니다` : "초대" };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteView token={token} />;
}
