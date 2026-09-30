import type { Schemas } from "@/shared/api";

// 여러 엔티티가 공유하는 값 타입. 도메인 엔티티를 몰라야 한다.
export type Role = "OWNER" | "FE" | "BE";
export type Level = "L1" | "L2" | "L3" | "L4";
export type Decider = "AUTO" | "PM_REVIEW" | "HUMAN" | "FORBIDDEN";

/** 서버 계약의 역할. 목업의 Role("FE" | "BE")과 값이 다르다 */
export type TeamRole = NonNullable<Schemas["OrgAgent"]["assignment"]>["teamRole"];
export type OrgRole = Schemas["Member"]["orgRole"];
