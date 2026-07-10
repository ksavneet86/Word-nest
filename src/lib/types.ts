export interface WordForms {
  singular?: string;
  plural?: string;
  present?: string;
  past?: string;
  pastParticiple?: string;
}

export interface WordLocation {
  libraryId: string;
  folderId: string;
  listId: string;
  library: string;
  folder: string;
  list: string;
}

/** Client-side shape of a word row — dates are epoch ms to match the reference artifact's logic. */
export interface WordRecord {
  id: string;
  word: string;
  meaning: string;
  pos?: string | null;
  synonyms: string[];
  antonyms: string[];
  sentenceTip?: string | null;
  emoji?: string | null;
  pictogramId?: string | null;
  category: string;
  difficulty: "low" | "moderate" | "high";
  forms: WordForms;
  needsMotion: boolean;
  visualQuery?: string | null;
  gifUrl?: string | null;
  timesWrong: number;
  srsInterval: number;
  srsDue: number;
  addedAt: number;
  _loc: WordLocation;
}

export interface WordListNode {
  id: string;
  words: WordRecord[];
}

export interface FolderNode {
  id: string;
  lists: Record<string, WordListNode>;
}

export interface LibraryNode {
  id: string;
  folders: Record<string, FolderNode>;
}

/** Nested Library -> Folder -> List -> words[], mirroring the reference artifact's in-memory tree shape (with ids attached at every level, since real DB rows need them). */
export type SectionTree = Record<string, LibraryNode>;

export interface GeneratedWord {
  word: string;
  meaning: string;
  pos: string;
  synonyms: string[];
  antonyms: string[];
  sentenceTip: string;
  emoji: string;
  difficulty: "low" | "moderate" | "high";
  category: string;
  forms: WordForms;
  needsMotion: boolean;
  visualQuery?: string;
  pictogramId?: string | null;
}

export interface LearnerSummary {
  id: string;
  name: string;
  avatarEmoji: string | null;
  hasPin: boolean;
  ownerEmail?: string;
}

export interface SessionEntry {
  id: string;
  type: "quiz" | "blank" | "sentence";
  section: string;
  listId: string | null;
  correct: number;
  total: number;
  createdAt: number;
}
