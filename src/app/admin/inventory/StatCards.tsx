import { cx } from "~/lib/cx";
import type { RouterOutputs } from "~/trpc/react";

type Stats = RouterOutputs["inventory"]["stats"];

export function StatCards({ stats }: { stats: Stats | undefined }) {
  const cards = [
    { label: "Low-stock variants", value: stats?.lowStockCount, dark: false },
    { label: "Sold-out variants", value: stats?.soldOutCount, dark: true },
    { label: "Orders to ship", value: stats?.ordersToShip, dark: false },
    { label: "Open return requests", value: stats?.openReturns, dark: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cx(
            "border-ink flex flex-col gap-1.5 border p-5",
            card.dark && "bg-ink text-paper",
          )}
        >
          <p className={cx("text-sm", !card.dark && "text-muted")}>
            {card.label}
          </p>
          <p className="font-mono text-3xl font-semibold">
            {card.value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
