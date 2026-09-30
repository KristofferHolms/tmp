import { readFile } from "node:fs/promises";
import path from "node:path";
import MapView from "@/components/map/map";
import { TrajTable } from "@/components/datatable/trajtable";
import { DATA_DIR, readSummaries, type TrajRow } from "@/lib/plt";

const SUMMARY_FILE = path.join(process.cwd(), "data", "build", "summaries.json");

// How many rows per page in the table
const PAGE_SIZE = 100;

async function loadRows(page: number): Promise<{ rows: TrajRow[]; total: number }> {
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  try {
    // Fast path: precomputed by `bun run tiles:geojson`
    const all: TrajRow[] = JSON.parse(await readFile(SUMMARY_FILE, "utf8"));
    return { rows: all.slice(start, end), total: all.length };
  } catch {
    // Fallback: read .plt files directly (one extra to know if there's a next page)
    const all = await readSummaries(DATA_DIR, end + 1);
    return { rows: all.slice(start, end), total: all.length };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);

  const { rows, total } = await loadRows(page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-24">
      <MapView />
      <TrajTable
        rows={rows}
        total={total}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
