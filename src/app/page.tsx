import MapView from "@/components/map/map";
import { TrajTable } from "@/components/datatable/trajtable";
import { getSummary, getSummaryPage, SORT_KEYS, type SortKey } from "@/lib/summaries";
import { getTrackGeometry } from "@/lib/tracks";

// How many rows per page in the table
const PAGE_SIZE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; dir?: string; sel?: string }>;
}) {
  const params = await searchParams;
  const sort = SORT_KEYS.includes(params.sort as SortKey) ? (params.sort as SortKey) : "id";

  const selected = params.sel ? await getSummary(params.sel) : null;
  const selectedGeometry = selected ? await getTrackGeometry(selected.id) : null;
  
  const summary = await getSummaryPage({
    sel: selected?.id ?? null,
    page: Math.max(1, Math.floor(Number(params.page)) || 1),
    pageSize: PAGE_SIZE,
    q: params.q ?? "",
    sort,
    dir: params.dir === "desc" ? "desc" : "asc",
  });

  return (
    // Side by side on wide screens (each half scrolls on its own), stacked on narrow ones
    <main className="flex flex-col lg:grid lg:h-screen lg:grid-cols-2">
      <div className="h-[60vh] lg:h-screen">
        <MapView selected={selected} selectedGeometry={selectedGeometry} />
      </div>
      <div className="p-4 lg:overflow-y-auto">
        <TrajTable {...summary} />
      </div>
    </main>
  );
}
