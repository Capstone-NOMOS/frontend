import { describe, expect, it } from "vitest";
import { keepMessagesById } from "./roomApi";

const msg = (id: string, text = id) => ({ id, text, activity: { kind: "say", target: text } });
const feed = (...pages: ReturnType<typeof msg>[][]) => ({
  pages: pages.map((messages, i) => ({ messages, nextBefore: i < pages.length - 1 ? messages.at(-1)!.id : null })),
  pageParams: pages.map((_, i) => (i === 0 ? null : pages[i - 1].at(-1)!.id)),
});
type Feed = ReturnType<typeof feed>;

describe("keepMessagesById — 피드의 구조 공유", () => {
  it("새 줄이 와서 페이지 경계가 밀려도 같은 id의 줄은 이전 객체 그대로다", () => {
    const old = feed([msg("3"), msg("2")], [msg("1")]);
    const next = keepMessagesById(old, feed([msg("4"), msg("3")], [msg("2"), msg("1")])) as Feed;

    expect(next.pages[0].messages[1]).toBe(old.pages[0].messages[0]); // 3
    expect(next.pages[1].messages[0]).toBe(old.pages[0].messages[1]); // 2
    expect(next.pages[1].messages[1]).toBe(old.pages[1].messages[0]); // 1
    expect(next.pages[0].messages[0].id).toBe("4");
  });

  it("내용이 바뀐 줄은 새 객체다", () => {
    const old = feed([msg("2"), msg("1")]);
    const next = keepMessagesById(old, feed([msg("2", "고친 문장"), msg("1")])) as Feed;

    expect(next.pages[0].messages[0]).not.toBe(old.pages[0].messages[0]);
    expect(next.pages[0].messages[0].text).toBe("고친 문장");
    expect(next.pages[0].messages[1]).toBe(old.pages[0].messages[1]);
  });

  it("바뀐 것이 없으면 이전 데이터 그대로 돌려준다 (다시 그리지 않는다)", () => {
    const old = feed([msg("2"), msg("1")]);
    expect(keepMessagesById(old, feed([msg("2"), msg("1")]))).toBe(old);
  });

  it("select 결과(줄 배열)는 줄이 같으면 이전 배열 그대로다", () => {
    const [a, b, c] = [msg("1"), msg("2"), msg("3")];
    const old = [a, b];
    expect(keepMessagesById(old, [a, b])).toBe(old);
    expect(keepMessagesById(old, [c, a, b])).toEqual([c, a, b]);
  });

  it("처음 받은 데이터는 그대로 쓴다", () => {
    const first = feed([msg("1")]);
    expect(keepMessagesById(undefined, first)).toBe(first);
  });
});
