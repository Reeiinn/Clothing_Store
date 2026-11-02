import { Button } from "~/components/Button";

export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;

  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        Showing {firstRow}–{lastRow} of {total}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={lastRow >= total}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
