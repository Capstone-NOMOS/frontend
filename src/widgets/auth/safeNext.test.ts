import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext — ?next=로 외부 사이트에 보내지 않는다", () => {
  it("같은 사이트 경로는 그대로 돌려준다", () => {
    expect(safeNext("/p/1")).toBe("/p/1");
    expect(safeNext("/p/1/inbox?tab=a#x")).toBe("/p/1/inbox?tab=a#x");
  });

  it("값이 없으면 null", () => {
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("")).toBeNull();
  });

  it.each([
    ["//evil.com", "프로토콜 상대 주소"],
    ["/\\evil.com", "브라우저가 //로 읽는 역슬래시"],
    ["https://evil.com", "절대 주소"],
    ["evil.com", "슬래시로 시작하지 않는 값"],
    ["/\t/evil.com", "URL 파서가 지우는 탭"],
    ["/\n/evil.com", "URL 파서가 지우는 개행"],
  ])("%j 거부 (%s)", (next) => {
    expect(safeNext(next)).toBeNull();
  });
});
