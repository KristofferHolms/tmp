import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SummaryPage } from "@/lib/summaries";

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const base = "rounded-md border px-3 py-1.5 text-sm";

  if (disabled) {
    return (
      <span className={`${base} cursor-not-allowed border-slate-200 text-slate-300`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={`?page=${page}`}
      scroll={false}
      className={`${base} border-slate-300 text-slate-700 hover:bg-slate-100`}
    >
      {children}
    </Link>
  );
}

export function TrajTable({ rows, page, pageSize, total, totalPages }: SummaryPage) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Trajektorer</h2>
        <p className="text-sm text-slate-500">
          Viser {from.toLocaleString()}–{to.toLocaleString()} af {total.toLocaleString()} trajektorer
          fra Geolife
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Punkter</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Slut</TableHead>
            <TableHead>Varighed</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-slate-800">{row.id}</TableCell>
              <TableCell>{row.points.toLocaleString()}</TableCell>
              <TableCell>{row.start}</TableCell>
              <TableCell>{row.end}</TableCell>
              <TableCell>{row.duration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Side {page.toLocaleString()} af {totalPages.toLocaleString()}
        </span>

        <div className="flex gap-2">
          <PageLink page={1} disabled={page <= 1}>« Første</PageLink>
          <PageLink page={page - 1} disabled={page <= 1}>‹ Forrige</PageLink>
          <PageLink page={page + 1} disabled={page >= totalPages}>Næste ›</PageLink>
          <PageLink page={totalPages} disabled={page >= totalPages}>Sidste »</PageLink>
        </div>
      </div>
    </div>
  );
}