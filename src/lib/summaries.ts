import { readFile } from "node:fs/promises";
import { SUMMARY_FILE } from "./build-files";
import type { TrajRow } from "./plt";

export const SORT_KEYS = ["id", "points", "seconds"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export type SummaryQuery = {
  sel: string | null;
  page: number;
  pageSize: number;
  q: string;
  sort: SortKey;
  dir: SortDir;
};

export type SummaryPage = SummaryQuery & {
  rows: TrajRow[];
  total: number;
  totalPages: number;
};

let cache: TrajRow[] | null = null;

// Loads the precomputed summaries once and keeps them in memory
async function loadAllSummaries(): Promise<TrajRow[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(SUMMARY_FILE, "utf8")) as TrajRow[];
    return cache;
  } catch (error) {
    throw new Error(`Could not read ${SUMMARY_FILE}. Run \`bun run data:build\` first.`, {
      cause: error,
    });
  }
}

const compare: Record<SortKey, (a: TrajRow, b: TrajRow) => number> = {
  id: (a, b) => a.user - b.user || a.trip - b.trip,
  points: (a, b) => a.points - b.points,
  seconds: (a, b) => a.seconds - b.seconds,
};

export async function getSummary(id: string): Promise<TrajRow | null> {
  return (await loadAllSummaries()).find((row) => row.id === id) ?? null;
}

export async function getSummaryPage(query: SummaryQuery): Promise<SummaryPage> {
  const all = await loadAllSummaries();
  const { pageSize, q, sort, dir } = query;

  // Prefix match, so "12-" finds all of user 12's trajectories
  const needle = q.trim().toLowerCase();
  const matches = needle ? all.filter((row) => row.id.startsWith(needle)) : [...all];

  // Ties fall back to id order so the result is stable
  const sign = dir === "asc" ? 1 : -1;
  matches.sort((a, b) => sign * compare[sort](a, b) || compare.id(a, b));

  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * pageSize;

  return {
    ...query,
    page,
    rows: matches.slice(start, start + pageSize),
    total,
    totalPages,
  };
}
