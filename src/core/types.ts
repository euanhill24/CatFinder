import type { ScoreKey, Scores } from "./rules";

export type Sex = "male" | "female" | "unknown";
export type Decision = "liked" | "dismissed";
export type SourceStatus = "listed" | "reserved" | "sold";

/** One plain-English sentence per score (R-21). */
export type ScoreReasons = Record<ScoreKey, string>;

/** A listing as the app shows it. */
export interface Cat {
  id: string;
  source: string;
  externalUrl: string;
  title: string | null;
  pricePence: number | null;
  ageMonths: number | null;
  sex: Sex;
  location: string | null;
  description: string | null;
  photoUrls: string[];
  listedAt: string | null;
  firstSeenAt: string;
  scores: Scores;
  overall: number;
  reasons: ScoreReasons;
  /** Other adverts for the same cat (R-13). */
  otherAdverts: { source: string; externalUrl: string }[];
}

export interface SavedCat extends Cat {
  likedAt: string;
  note: string | null;
  /** No longer on its source site: sold, reserved or not seen recently (R-64). */
  gone: boolean;
}

export interface Deck {
  /** Best match first. At most the requested page size. */
  cats: Cat[];
  /** All cats still awaiting a decision, including those not in `cats`. */
  remaining: number;
  /** Of `remaining`, how many arrived after the given last-visit time (R-47). */
  newSinceLastVisit: number;
}

export interface CollectionStatus {
  /** When listings were last successfully checked for (R-81). Null if never. */
  lastCheckedAt: string | null;
  /** True when that is longer ago than the app tolerates (R-82). */
  overdue: boolean;
}
