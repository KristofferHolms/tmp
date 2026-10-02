import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LngLat } from "@/lib/plt";
import type { SortDir, SortKey, SummaryPage } from "@/lib/summaries";
import { cn, formatDuration } from "@/lib/utils";

const formatLngLat = ([lon, lat]: LngLat) => `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

type ViewState = Pick<SummaryPage, "sel" | "page" | "q" | "sort" | "dir">;

// Builds a query string for the table state, leaving out defaults
function hrefFor({ sel, page, q, sort, dir }: ViewState): string {
  const params = new URLSearchParams();
  if (sel) params.set("sel", sel);
  if (q) params.set("q", q);
  if (sort !== "id") params.set("sort", sort);
  if (dir !== "asc") params.set("dir", dir);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "?";
}

// Page numbers to show: always first and last, plus a window around the current page.
// `null` marks a gap (rendered as "…")
function pageItems(page: number, totalPages: number, radius = 2): (number | null)[] {
  const items: (number | null)[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= radius) {
      items.push(p);
    } else if (items[items.length - 1] !== null) {
      items.push(null);
    }
  }
  return items;
}

function Pagination({ state, totalPages }: { state: ViewState; totalPages: number }) {
  return (
    <nav aria-label="Sider" className="flex flex-wrap items-center gap-1">
      {pageItems(state.page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor({ ...state, page: p })}
            scroll={false}
            aria-current={p === state.page ? "page" : undefined}
            className={cn(
              "min-w-9 rounded-md border px-2 py-1.5 text-center text-sm tabular-nums",
              p === state.page
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {p.toLocaleString()}
          </Link>
        )
      )}
    </nav>
  );
}

function SortHead({
  label,
  column,
  state,
}: {
  label: string;
  column: SortKey;
  state: ViewState;
}) {
  const active = state.sort === column;
  // Clicking the active column flips direction; a new column starts with the
  // most useful order (lowest id first, most points / longest duration first)
  const nextDir: SortDir = active
    ? state.dir === "asc"
      ? "desc"
      : "asc"
    : column === "id"
      ? "asc"
      : "desc";
  const arrow = active ? (state.dir === "asc" ? "▲" : "▼") : "";

  return (
    <TableHead aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={hrefFor({ ...state, sort: column, dir: nextDir, page: 1 })}
        scroll={false}
        className="inline-flex items-center gap-1 hover:underline"
      >
        {label}
        <span className="w-3 text-xs text-muted-foreground">{arrow}</span>
      </Link>
    </TableHead>
  );
}

function SearchForm({ state }: { state: ViewState }) {
  return (
    <form className="flex items-center gap-2" role="search">
      <input
        type="search"
        name="q"
        defaultValue={state.q}
        placeholder="Søg ID, fx 12-3"
        aria-label="Søg efter trajektorie-ID"
        className="h-9 w-48 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      {state.sort !== "id" && <input type="hidden" name="sort" value={state.sort} />}
      {state.dir !== "asc" && <input type="hidden" name="dir" value={state.dir} />}
      {state.sel && <input type="hidden" name="sel" value={state.sel} />}
      <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">
        Søg
      </button>
      {state.q && (
        <Link
          href={hrefFor({ ...state, q: "", page: 1 })}
          scroll={false}
          className="text-sm text-muted-foreground hover:underline"
        >
          Ryd
        </Link>
      )}
    </form>
  );
}

export function TrajTable({ rows, page, pageSize, total, totalPages, q, sort, dir, sel }: SummaryPage) {
  const state: ViewState = { sel, page, q, sort, dir };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="w-full rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Trajectories</h2>
          <p className="text-sm text-muted-foreground">
            Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}{" "}
            Trajectories from Geolife
            {q && <> Matches &quot;{q}&quot;</>}
          </p>
        </div>
        <SearchForm state={state} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortHead label="ID" column="id" state={state} />
            <SortHead label="Points" column="points" state={state} />
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <SortHead label="Duration" column="seconds" state={state} />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            // The ID link stretches over the whole row, so any click on the row selects it
            <TableRow
              key={row.id}
              data-state={row.id === sel ? "selected" : undefined}
              className="relative"
            >
              <TableCell className="font-medium">
                <Link
                  href={hrefFor({ ...state, sel: row.id === sel ? null : row.id })}
                  scroll={false}
                  className="after:absolute after:inset-0"
                >
                  {row.id}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">{row.points.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{formatLngLat(row.start)}</TableCell>
              <TableCell className="tabular-nums">{formatLngLat(row.end)}</TableCell>
              <TableCell className="tabular-nums">{formatDuration(row.seconds)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Ingen trajektorer matcher &quot;{q}&quot;
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          Side {page.toLocaleString()} of {totalPages.toLocaleString()}
        </span>
        <Pagination state={state} totalPages={totalPages} />
      </div>
    </div>
  );
}
