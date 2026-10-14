import type { OrderStatus } from "../../generated/prisma";

import { cx } from "~/lib/cx";

export type StockStatus = "OK" | "LOW" | "SOLD_OUT";

const styles: Record<OrderStatus | StockStatus, string> = {
  PROCESSING: "bg-warn-bg text-warn",
  SHIPPED: "bg-info-bg text-info",
  DELIVERED: "bg-ok-bg text-ok",
  CANCELLED: "bg-placeholder text-muted",
  OK: "bg-ok-bg text-ok",
  LOW: "bg-warn-bg text-warn",
  SOLD_OUT: "bg-danger-bg text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus | StockStatus }) {
  return (
    <span
      className={cx(
        "inline-block px-2 py-0.5 font-mono text-xs tracking-wide",
        styles[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
