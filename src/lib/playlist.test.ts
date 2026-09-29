import { describe, expect, it } from "vitest";
import { countPlayable, firstPlayable, nextPlayable, resolveIndex, type QueueItem } from "./playlist";

const item = (id: string, videoId: string | null = "v-" + id): QueueItem => ({ id, title: "Song " + id, videoId });

describe("firstPlayable / countPlayable", () => {
  it("finds the first song with a video, skipping ones without", () => {
    expect(firstPlayable([item("a", null), item("b"), item("c")])).toBe(1);
    expect(firstPlayable([item("a")])).toBe(0);
  });
  it("is null when nothing can play", () => {
    expect(firstPlayable([])).toBeNull();
    expect(firstPlayable([item("a", null), item("b", null)])).toBeNull();
  });
  it("counts songs that have a video", () => {
    expect(countPlayable([item("a"), item("b", null), item("c")])).toBe(2);
    expect(countPlayable([])).toBe(0);
  });
});

describe("nextPlayable", () => {
  const queue = [item("a"), item("b", null), item("c", null), item("d"), item("e")];

  it("goes forward, jumping over songs without a video", () => {
    expect(nextPlayable(queue, 0, 1)).toBe(3);
    expect(nextPlayable(queue, 3, 1)).toBe(4);
  });
  it("goes back, jumping over songs without a video", () => {
    expect(nextPlayable(queue, 3, -1)).toBe(0);
    expect(nextPlayable(queue, 4, -1)).toBe(3);
  });
  it("is null past either end (the lineup is finished)", () => {
    expect(nextPlayable(queue, 4, 1)).toBeNull();
    expect(nextPlayable(queue, 0, -1)).toBeNull();
    expect(nextPlayable([item("a"), item("b", null)], 0, 1)).toBeNull();
  });
  it("copes with a position outside the list", () => {
    expect(nextPlayable(queue, -1, 1)).toBe(0);
    expect(nextPlayable(queue, 99, 1)).toBeNull();
    expect(nextPlayable([], 0, 1)).toBeNull();
  });
});

describe("resolveIndex (the lineup changed while playing)", () => {
  it("follows the playing song when it moves", () => {
    expect(resolveIndex([item("b"), item("c"), item("a")], "a", 0)).toBe(2);
  });
  it("stays at the same position when the playing song was removed", () => {
    expect(resolveIndex([item("a"), item("c"), item("d")], "b", 1)).toBe(1);
  });
  it("stays inside the list when it got shorter", () => {
    expect(resolveIndex([item("a")], "gone", 5)).toBe(0);
    expect(resolveIndex([item("a"), item("b")], null, -3)).toBe(0);
  });
  it("is -1 for an empty list", () => {
    expect(resolveIndex([], "a", 0)).toBe(-1);
  });
});
