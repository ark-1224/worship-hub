import { describe, expect, it } from "vitest";
import { parseSpotifyInput, parseYouTubeInput, youtubeWatchUrl } from "./links";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeInput", () => {
  it.each([
    ["normal watch link", `https://www.youtube.com/watch?v=${ID}`],
    ["watch link with extra params", `https://www.youtube.com/watch?feature=share&v=${ID}&t=42s&list=PL1`],
    ["no www", `https://youtube.com/watch?v=${ID}`],
    ["mobile link", `https://m.youtube.com/watch?v=${ID}`],
    ["short youtu.be link", `https://youtu.be/${ID}`],
    ["short link with share tracking", `https://youtu.be/${ID}?si=abc123`],
    ["embed link", `https://www.youtube.com/embed/${ID}`],
    ["shorts link", `https://www.youtube.com/shorts/${ID}`],
    ["live link", `https://www.youtube.com/live/${ID}`],
    ["music.youtube.com", `https://music.youtube.com/watch?v=${ID}`],
    ["no scheme", `youtube.com/watch?v=${ID}`],
    ["surrounding whitespace", `  https://youtu.be/${ID}  `],
    ["bare video id", ID],
  ])("accepts %s", (_name, input) => {
    expect(parseYouTubeInput(input)).toEqual({ ok: true, value: ID });
  });

  it("treats an empty field as 'no video'", () => {
    expect(parseYouTubeInput("")).toEqual({ ok: true, value: null });
    expect(parseYouTubeInput("   ")).toEqual({ ok: true, value: null });
  });

  it.each([
    ["random text", "hello world"],
    ["another site", `https://vimeo.com/watch?v=${ID}`],
    ["lookalike host", `https://youtube.com.evil.com/watch?v=${ID}`],
    ["too-short id", "https://youtu.be/abc"],
    ["watch link without v=", "https://www.youtube.com/watch"],
    ["channel link", "https://www.youtube.com/@somechannel"],
    ["javascript url", "javascript:alert(1)"],
  ])("rejects %s", (_name, input) => {
    const result = parseYouTubeInput(input);
    expect(result.ok).toBe(false);
  });

  it("rebuilds a watch URL from a stored id", () => {
    expect(youtubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});

describe("parseSpotifyInput", () => {
  it("accepts open.spotify.com links and empty input", () => {
    const link = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=xyz";
    expect(parseSpotifyInput(link)).toEqual({ ok: true, value: link });
    expect(parseSpotifyInput("")).toEqual({ ok: true, value: null });
  });

  it.each(["https://example.com/track/1", "javascript:alert(1)", "http://open.spotify.com/track/1", "not a link"])(
    "rejects %s",
    (input) => {
      expect(parseSpotifyInput(input).ok).toBe(false);
    },
  );
});
