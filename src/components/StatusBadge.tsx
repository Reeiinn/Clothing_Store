import type { OrderStatus, ReturnStatus } from "../../generated/prisma";

import { cx } from "~/lib/cx";
import type { StockStatus } from "~/lib/stock";

const styles: Record<OrderStatus | ReturnStatus | StockStatus, string> = {
  PROCESSING: "bg-warn-bg text-warn",
  SHIPPED: "bg-info-bg text-info",
  DELIVERED: "bg-ok-bg text-ok",
  CANCELLED: "bg-placeholder text-muted",
  REQUESTED: "bg-warn-bg text-warn",
  APPROVED: "bg-info-bg text-info",
  RECEIVED: "bg-ok-bg text-ok",
  REJECTED: "bg-danger-bg text-danger",
  OK: "bg-ok-bg text-ok",
  LOW: "bg-warn-bg text-warn",
  SOLD_OUT: "bg-danger-bg text-danger",
};

export function StatusBadge({
  status,
}: {
  status: OrderStatus | ReturnStatus | StockStatus;
}) {
  return (
    <span
      className={cx(
        "inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] tracking-wide",
        styles[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
