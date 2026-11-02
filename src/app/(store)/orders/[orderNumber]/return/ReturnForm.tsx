"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonStyles } from "~/components/Button";
import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { QuantityStepper } from "~/components/QuantityStepper";
import { cx } from "~/lib/cx";
import { formatPrice } from "~/lib/format";
import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";

import { itemsLabel } from "../../OrderTracking";

type Item = RouterOutputs["returns"]["eligibility"]["items"][number] & {
  unitPriceCents: number;
};
type Reason = RouterInputs["returns"]["create"]["items"][number]["reason"];
type Selection = { reason: Reason | ""; quantity: number };

const reasons: { value: Reason; label: string }[] = [
  { value: "SIZE_DIDNT_FIT", label: "Size didn't fit" },
  { value: "NOT_AS_PICTURED", label: "Not as pictured" },
  { value: "DAMAGED", label: "Damaged or defective" },
  { value: "WRONG_ITEM", label: "Wrong item sent" },
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "OTHER", label: "Other" },
];

export function ReturnForm({
  orderNumber,
  items,
}: {
  orderNumber: number;
  items: Item[];
}) {
  const utils = api.useUtils();
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  const create = api.returns.create.useMutation({
    onMutate: () => setError(undefined),
    onSuccess: async () => {
      // So My orders shows the new return status
      await Promise.all([utils.order.invalidate(), utils.returns.invalidate()]);
    },
    onError: (e) => setError(e.message),
  });

  if (create.isSuccess) {
    return (
      <div className="border-ink flex flex-col items-start gap-4 border p-6 sm:p-8">
        <p role="status" className="text-lg font-medium">
          Return request sent. We&apos;ll email you the next steps.
        </p>
        <Link href="/orders" className={buttonStyles({ variant: "primary" })}>
          Back to my orders
        </Link>
      </div>
    );
  }

  const chosen = items.filter((item) => selected[item.orderItemId]);
  const quantity = chosen.reduce(
    (sum, item) => sum + selected[item.orderItemId]!.quantity,
    0,
  );
  const refundCents = chosen.reduce(
    (sum, item) =>
      sum + item.unitPriceCents * selected[item.orderItemId]!.quantity,
    0,
  );
  const canSubmit =
    chosen.length > 0 &&
    chosen.every((item) => selected[item.orderItemId]!.reason !== "");

  function toggle(id: string) {
    setSelected(({ [id]: current, ...rest }) =>
      current ? rest : { ...rest, [id]: { reason: "", quantity: 1 } },
    );
  }

  function update(id: string, change: Partial<Selection>) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id]!, ...change } }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    create.mutate({
      orderNumber,
      items: chosen.map((item) => {
        const { reason, quantity } = selected[item.orderItemId]!;
        return {
          orderItemId: item.orderItemId,
          quantity,
          reason: reason as Reason,
        };
      }),
      note: note.trim() || undefined,
    });
  }

  return (
    // On phones the summary drops below the items
    <form
      onSubmit={submit}
      className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {error && (
          <p
            role="alert"
            className="border-danger bg-danger-bg text-danger border p-4 text-sm font-medium"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">
            Which items are you returning?
          </h2>
          <p className="text-muted text-sm">Pick each item and tell us why.</p>
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const id = item.orderItemId;
            const selection = selected[id];
            const returned = item.returnableQty === 0;

            return (
              <li
                key={id}
                className={cx(
                  "flex flex-col gap-4 border p-4",
                  selection ? "border-ink" : "border-line",
                  returned && "opacity-60",
                )}
              >
                <label
                  className={cx(
                    "flex items-center gap-4",
                    returned ? "cursor-not-allowed" : "cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!selection}
                    disabled={returned || create.isPending}
                    onChange={() => toggle(id)}
                    className="accent-ink size-5 shrink-0"
                  />
                  <ImagePlaceholder
                    label={`${item.productName}, ${item.colorName}`}
                    className="h-[75px] w-14 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {item.productName}
                    </span>
                    <span className="text-muted text-sm">
                      {item.colorName} / {item.size} · Bought {item.boughtQty}
                    </span>
                    {returned && (
                      <span className="text-muted font-mono text-xs">
                        Already returned
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm">
                    {formatPrice(item.unitPriceCents)}
                  </span>
                </label>

                {selection && (
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`reason-${id}`} className="text-sm">
                        Reason
                      </label>
                      <select
                        id={`reason-${id}`}
                        value={selection.reason}
                        disabled={create.isPending}
                        onChange={(event) =>
                          update(id, { reason: event.target.value as Reason })
                        }
                        className="border-ink h-11 w-full border bg-white px-3 text-sm"
                      >
                        <option value="" disabled>
                          Choose a reason
                        </option>
                        {reasons.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      role="group"
                      aria-labelledby={`quantity-${id}`}
                      className="flex flex-col gap-1.5"
                    >
                      <p id={`quantity-${id}`} className="text-sm">
                        Quantity to return
                      </p>
                      <QuantityStepper
                        value={selection.quantity}
                        max={item.returnableQty}
                        disabled={create.isPending}
                        onChange={(value) => update(id, { quantity: value })}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="return-note" className="text-sm">
            Anything else we should know?{" "}
            <span className="text-muted">(Optional)</span>
          </label>
          <textarea
            id="return-note"
            rows={4}
            maxLength={1000}
            value={note}
            disabled={create.isPending}
            onChange={(event) => setNote(event.target.value)}
            className="border-ink w-full border bg-white p-3 text-sm"
          />
        </div>
      </div>

      <aside
        aria-label="Return summary"
        className="border-ink flex w-full flex-col gap-4 border p-6 lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0"
      >
        <h2 className="text-xl font-semibold">Return summary</h2>

        <div className="flex items-center justify-between gap-4">
          <p>Items selected</p>
          <p>{itemsLabel(quantity)}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p>Refund to</p>
          <p>Original payment</p>
        </div>

        <div className="border-ink flex items-start justify-between border-t pt-4 text-lg font-semibold">
          <p>Estimated refund</p>
          <p>{formatPrice(refundCents)}</p>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          loading={create.isPending}
          className="w-full"
        >
          Submit return request
        </Button>

        <p className="text-muted text-sm">
          Items must be unworn with tags attached. Returned stock goes back to
          that size and color once we receive it.
        </p>
      </aside>
    </form>
  );
}
