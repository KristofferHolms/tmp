import { readFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR, listPltFiles, summarizePlt, type TrajRow } from "./plt";

const SUMMARY_FILE = path.join(process.cwd(), "data", "build", "summaries.json");

export type SummaryPage = {
  rows: TrajRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

let cache: TrajRow[] | null = null;

// Loads the precomputed summaries once and keeps them in memory
async function loadAllSummaries(): Promise<TrajRow[] | null> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(SUMMARY_FILE, "utf8")) as TrajRow[];
    return cache;
  } catch {
    return null;
  }
}

export async function getSummaryPage(page: number, pageSize: number): Promise<SummaryPage> {
  const all = await loadAllSummaries();

  if (all) {
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    const start = (current - 1) * pageSize;

    return {
      rows: all.slice(start, start + pageSize),
      page: current,
      pageSize,
      total,
      totalPages,
    };
  }

  // Fallback: no summaries.json yet, so summarize only this page's files
  const files = await listPltFiles(DATA_DIR);
  const total = files.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;

  const rows = (
    await Promise.all(
      files.slice(start, start + pageSize).map(({ user, file }) => summarizePlt(file, user))
    )
  ).filter((r): r is TrajRow => r !== null);

  return { rows, page: current, pageSize, total, totalPages };
}