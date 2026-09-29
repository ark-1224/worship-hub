// The order "Play all" plays a lineup's videos in. Pure helpers, no video code.

export type QueueItem = { id: string; title: string; videoId: string | null };

const hasVideo = (item: QueueItem | undefined) => Boolean(item?.videoId);

/** Index of the first song that has a video, or null if none do. */
export function firstPlayable(queue: QueueItem[]): number | null {
  const i = queue.findIndex(hasVideo);
  return i === -1 ? null : i;
}

/**
 * The next song to play after `from`, going forward (step 1) or back (-1).
 * Songs without a video are skipped. Null at either end of the lineup.
 */
export function nextPlayable(queue: QueueItem[], from: number, step: 1 | -1): number | null {
  for (let i = from + step; i >= 0 && i < queue.length; i += step) {
    if (hasVideo(queue[i])) return i;
  }
  return null;
}

/**
 * Where we are after the lineup was edited while playing (someone reordered it
 * or removed a song). Follows the song that's playing; if it was removed, stays
 * at the same position. -1 for an empty list.
 */
export function resolveIndex(queue: QueueItem[], currentId: string | null, fallbackIndex: number): number {
  if (queue.length === 0) return -1;
  const found = currentId === null ? -1 : queue.findIndex((item) => item.id === currentId);
  if (found !== -1) return found;
  return Math.min(Math.max(fallbackIndex, 0), queue.length - 1);
}

/** How many songs have a video, for the "3 of 5 songs have a video" note. */
export function countPlayable(queue: QueueItem[]): number {
  return queue.filter(hasVideo).length;
}
