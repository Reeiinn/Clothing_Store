"use client";

import { useState } from "react";

import { Button } from "~/components/Button";
import { StatusBadge } from "~/components/StatusBadge";
import { cx } from "~/lib/cx";
import { api, type RouterOutputs } from "~/trpc/react";
import { errorMessage } from "../_components/error-message";
import { Pager } from "../_components/Pager";

export type AlertItem = RouterOutputs["inventory"]["alerts"]["rows"][number];

const th = "px-4 py-3 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-2.5 text-sm";

function RowActions({ item }: { item: AlertItem }) {
  const utils = api.useUtils();
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requestRestock = api.inventory.requestRestock.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.inventory.alerts.invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const restock = api.inventory.restock.useMutation({
    onSuccess: async () => {
      setAdding(false);
      setQuantity("");
      setError(null);
      // The row updates or leaves the list; the cards and grid change too.
      await utils.inventory.invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(quantity);
    if (quantity.trim() === "" || !Number.isInteger(amount) || amount < 1) {
      setError("Enter a whole number of 1 or more.");
      return;
    }
    setError(null);
    restock.mutate({ variantId: item.variantId, addQuantity: amount });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {adding ? (
        <form
          onSubmit={submit}
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Add quantity"
            aria-label={`Quantity to add for ${item.productName}, ${item.color}, ${item.size}`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border-ink bg-paper h-8 w-28 border px-2 font-mono text-xs"
            autoFocus
          />
          <Button type="submit" size="sm" loading={restock.isPending}>
            Add
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {item.restockRequested ? (
            <span className="text-muted text-xs">Restock requested</span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={requestRestock.isPending}
              onClick={() =>
                requestRestock.mutate({ variantId: item.variantId })
              }
            >
              Request restock
            </Button>
          )}
          <Button size="sm" onClick={() => setAdding(true)}>
            Restock
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger max-w-64 text-right text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function AlertsTable({
  items,
  total,
  page,
  pageSize,
  filter,
  loading,
  activeProductId,
  onSelectProduct,
  onPageChange,
}: {
  items: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
  filter: "ALL" | "SOLD_OUT" | "LOW";
  loading: boolean;
  activeProductId: string | undefined;
  onSelectProduct: (productId: string) => void;
  onPageChange: (page: number) => void;
}) {
  if (!loading && total === 0) {
    return (
      <p className="border-ink border p-6 text-sm">
        {filter === "ALL"
          ? "No low-stock variants 🎉"
          : filter === "SOLD_OUT"
            ? "No sold-out variants."
            : "No low-stock variants."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-ink overflow-x-auto border">
        <table className="w-full min-w-[56rem] border-collapse">
          <thead className="bg-placeholder border-ink border-b">
            <tr>
              <th className={th}>PRODUCT</th>
              <th className={th}>CATEGORY</th>
              <th className={th}>COLOR</th>
              <th className={th}>SIZE</th>
              <th className={`${th} text-right`}>IN STOCK</th>
              <th className={th}>STATUS</th>
              <th className={`${th} text-right`}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className={`${td} text-muted`}>
                  Loading alerts…
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr
                key={item.variantId}
                className={cx(
                  "border-line border-b last:border-b-0",
                  item.productId === activeProductId && "bg-ink/5",
                )}
              >
                <td className={td}>
                  <button
                    type="button"
                    onClick={() => onSelectProduct(item.productId)}
                    title="Show this product in the grid below"
                    className="text-left font-medium underline-offset-2 hover:underline"
                  >
                    {item.productName}
                  </button>
                </td>
                <td className={td}>{item.category}</td>
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      style={{ backgroundColor: item.colorHex }}
                      className="border-ink size-3 shrink-0 rounded-full border"
                    />
                    {item.color}
                  </span>
                </td>
                <td className={`${td} font-mono`}>{item.size}</td>
                <td className={`${td} text-right font-mono`}>{item.stock}</td>
                <td className={td}>
                  <StatusBadge status={item.status} />
                </td>
                <td className={td}>
                  <RowActions item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
