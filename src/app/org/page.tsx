import { redirect } from "next/navigation";

// 조직 화면은 설정으로 옮겼다. 예전 주소로 들어와도 같은 곳에 닿게 한다
export default function Page() {
  redirect("/settings/org");
}
