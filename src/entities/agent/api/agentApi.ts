import { useQuery } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";

export const agentKeys = {
  all: ["agent"] as const,
  org: (orgId: string) => [...agentKeys.all, "org", orgId] as const,
};

/** 조직의 에이전트 목록. 접속 상태(online/offline)는 API가 주지 않는다 — 목록에 있으면 "연결한 적 있음" */
export function useOrgAgents(orgId: string | null) {
  return useQuery({
    queryKey: agentKeys.org(orgId ?? ""),
    queryFn: () => apiFetch<{ agents: Schemas["OrgAgent"][] }>(`/orgs/${orgId}/agents`),
    enabled: orgId !== null,
  });
}
