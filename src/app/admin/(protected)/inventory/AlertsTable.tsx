"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "~/components/Button";
import { StatusBadge } from "~/components/StatusBadge";
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

  const restock = api.inventory.restock.useMutation({
    onSuccess: async () => {
      setAdding(false);
      setQuantity("");
      setError(null);
      await utils.inventory.invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(quantity);
    if (quantity.trim() === "" || !Number.isInteger(amount) || amount < 1) {
      setError("Enter how many arrived (1 or more).");
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
            placeholder="How many?"
            aria-label={`How many ${item.productName}, ${item.color}, ${item.size} arrived`}
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
        <Button size="sm" onClick={() => setAdding(true)}>
          Add stock
        </Button>
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
  onPageChange,
}: {
  items: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
  filter: "ALL" | "SOLD_OUT" | "LOW";
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!loading && total === 0) {
    return (
      <p className="border-ink border p-6 text-sm">
        {filter === "ALL"
          ? "Everything is well stocked. Nothing to do here."
          : filter === "SOLD_OUT"
            ? "Nothing is sold out."
            : "Nothing is running low."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-ink overflow-x-auto border">
        <table className="w-full min-w-[44rem] border-collapse">
          <thead className="bg-placeholder border-ink border-b">
            <tr>
              <th className={th}>PRODUCT</th>
              <th className={th}>COLOR</th>
              <th className={th}>SIZE</th>
              <th className={`${th} text-right`}>LEFT</th>
              <th className={th}>STATUS</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className={`${td} text-muted`}>
                  Loading…
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr
                key={item.variantId}
                className="border-line border-b last:border-b-0"
              >
                <td className={td}>
                  <Link
                    href={`/products/${item.productId}`}
                    title="See every size and color of this product"
                    className="font-medium underline underline-offset-2"
                  >
                    {item.productName}
                  </Link>
                </td>
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
                <td className={`${td} whitespace-nowrap`}>
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
