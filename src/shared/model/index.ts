// 여러 엔티티가 공유하는 값 타입. 도메인 엔티티를 몰라야 한다.
export type Role = "OWNER" | "FE" | "BE";
export type Level = "L1" | "L2" | "L3" | "L4";
export type Decider = "AUTO" | "PM_REVIEW" | "HUMAN" | "FORBIDDEN";
