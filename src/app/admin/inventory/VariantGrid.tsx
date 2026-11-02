"use client";

import { useState } from "react";

import { Button } from "~/components/Button";
import { cx } from "~/lib/cx";
import { api, type RouterOutputs } from "~/trpc/react";
import { errorMessage } from "../_components/error-message";

type Grid = RouterOutputs["inventory"]["variantMatrix"];

const cellStyles = {
  SOLD_OUT: "bg-ink text-paper",
  LOW: "bg-line",
  OK: "bg-paper",
} as const;

const legend = [
  { label: "Sold out", className: cellStyles.SOLD_OUT },
  { label: "Low", className: cellStyles.LOW },
  { label: "OK", className: cellStyles.OK },
];

export function VariantGrid({
  grid,
  loading,
}: {
  grid: Grid | undefined;
  loading: boolean;
}) {
  const utils = api.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setStock = api.inventory.setStock.useMutation({
    onSuccess: async () => {
      setEditingId(null);
      setError(null);
      // Stock changed, so the cards and the alerts table may change too.
      await utils.inventory.invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (loading) {
    return <p className="text-muted text-sm">Loading stock grid…</p>;
  }
  if (!grid) {
    return (
      <p className="border-ink border p-6 text-sm">
        Pick a product in the alerts table to see its stock.
      </p>
    );
  }

  // Look the edited cell up in the current grid, so switching product closes the form.
  const editingCell = editingId
    ? grid.cells.find((cell) => cell.variantId === editingId)
    : undefined;
  const editing = editingCell && {
    label: `${editingCell.color} / ${editingCell.size}`,
    stock: editingCell.stock,
  };

  function startEditing(variantId: string, stock: number) {
    setEditingId(variantId);
    setValue(String(stock));
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const stock = Number(value);
    if (!editingId || value.trim() === "" || !Number.isInteger(stock)) {
      setError("Enter a whole number.");
      return;
    }
    setError(null);
    setStock.mutate({ variantId: editingId, stock });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Stock by variant — {grid.productName}
        </h2>
        <ul className="flex items-center gap-4 text-sm">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cx("border-ink size-3.5 border", item.className)}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-mono text-xs font-medium">
                COLOR
              </th>
              {grid.sizes.map((size) => (
                <th key={size} className="font-mono text-xs font-medium">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.colors.map((color) => (
              <tr key={color.name}>
                <th className="px-2 py-1 text-left text-sm font-medium whitespace-nowrap">
                  {color.name}
                </th>
                {grid.sizes.map((size) => {
                  const cell = grid.cells.find(
                    (c) => c.color === color.name && c.size === size,
                  );
                  const variantId = cell?.variantId;
                  return (
                    <td key={size} className="p-0">
                      {cell && variantId ? (
                        <button
                          type="button"
                          onClick={() => startEditing(variantId, cell.stock)}
                          aria-label={`${color.name} ${size}: ${cell.stock} in stock. Edit stock.`}
                          className={cx(
                            "border-ink flex h-11 w-20 items-center justify-center border font-mono text-sm transition-shadow",
                            cellStyles[cell.status],
                            variantId === editingId &&
                              "ring-ink ring-2 ring-offset-2",
                          )}
                        >
                          {cell.stock}
                        </button>
                      ) : (
                        <span
                          aria-label={`${color.name} ${size}: not sold`}
                          className="text-muted border-line flex h-11 w-20 items-center justify-center border border-dashed font-mono text-sm"
                        >
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form
          onSubmit={submit}
          className="border-ink flex flex-wrap items-center gap-3 border p-4"
        >
          <label htmlFor="exact-stock" className="text-sm">
            Set exact stock for{" "}
            <span className="font-medium">{editing.label}</span>
          </label>
          <input
            id="exact-stock"
            type="number"
            min={0}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border-ink bg-paper h-9 w-24 border px-2 font-mono text-sm"
            autoFocus
          />
          <Button type="submit" size="sm" loading={setStock.isPending}>
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingId(null);
              setError(null);
            }}
          >
            Cancel
          </Button>
          {error && (
            <p role="alert" className="text-danger w-full text-xs">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className="text-muted text-xs">
          Click a cell to set its exact stock.
        </p>
      )}
    </div>
  );
}
