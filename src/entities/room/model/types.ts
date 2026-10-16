import type { TeamRole } from "@/shared/model";

export type RoomType = "OWNER" | "FE" | "BE";

export interface Room {
  id: string;
  projectId: string;
  type: RoomType;
}

/** 화면 표시용 이름. 명세의 Room 1(FE)·2(BE)·3(대표)에 대응한다 */
export const ROOM_META: Record<RoomType, { name: string; who: string }> = {
  OWNER: { name: "대표 룸", who: "대표 + PM" },
  FE: { name: "FE 룸", who: "FE + FE 에이전트 + PM" },
  BE: { name: "BE 룸", who: "BE + BE 에이전트 + PM" },
};

/** 역할 룸(프로젝트 × 역할)의 주소 조각과 ROOM_META 키. /p/{projectId}/rooms/{slug} */
export const ROLE_ROOM: Record<TeamRole, { slug: string; type: Exclude<RoomType, "OWNER"> }> = {
  FRONTEND: { slug: "frontend", type: "FE" },
  BACKEND: { slug: "backend", type: "BE" },
};

export const roleOfRoomSlug = (slug: string) =>
  (Object.keys(ROLE_ROOM) as TeamRole[]).find((role) => ROLE_ROOM[role].slug === slug);
