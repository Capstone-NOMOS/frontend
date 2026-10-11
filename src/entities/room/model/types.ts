import type { TeamRole } from "@/shared/model";

export type RoomType = "OWNER" | "FE" | "BE";

export interface Room {
  id: string;
  projectId: string;
  type: RoomType;
}

export const ROOM_META: Record<RoomType, { no: number; name: string; who: string }> = {
  OWNER: { no: 3, name: "Room 3 · 대표", who: "대표 + PM" },
  FE: { no: 1, name: "Room 1 · FE", who: "FE + FE 에이전트 + PM" },
  BE: { no: 2, name: "Room 2 · BE", who: "BE + BE 에이전트 + PM" },
};

/** 역할 룸(프로젝트 × 역할)의 주소 조각과 ROOM_META 키. /p/{projectId}/rooms/{slug} */
export const ROLE_ROOM: Record<TeamRole, { slug: string; type: Exclude<RoomType, "OWNER"> }> = {
  FRONTEND: { slug: "frontend", type: "FE" },
  BACKEND: { slug: "backend", type: "BE" },
};

export const roleOfRoomSlug = (slug: string) =>
  (Object.keys(ROLE_ROOM) as TeamRole[]).find((role) => ROLE_ROOM[role].slug === slug);
