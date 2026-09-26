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
