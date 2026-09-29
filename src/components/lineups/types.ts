// Shapes shared by the lineup editor components.

/** One song in a lineup, as the editor shows it. */
export type EditorItem = {
  id: string; // the lineup_items row id
  songId: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  youtubeVideoId: string | null; // for "Play all"
  keyOverride: string | null; // key for THIS service only; null = the song's own key
  leaderId: string | null;
  note: string;
};

/** A library song that can be added through the picker. */
export type PickerSong = {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  youtubeVideoId: string | null;
};

export type Member = { id: string; name: string };
