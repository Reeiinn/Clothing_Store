"use client";

import { useState } from "react";

import { Button } from "~/components/Button";
import { api, type RouterOutputs } from "~/trpc/react";
import { errorMessage } from "../_components/error-message";

type OrderStatus =
  RouterOutputs["order"]["adminList"]["orders"][number]["status"];

export function OrderActions({
  orderNumber,
  status,
}: {
  orderNumber: number;
  status: OrderStatus;
}) {
  const utils = api.useUtils();
  const [mode, setMode] = useState<"idle" | "ship" | "cancel">("idle");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const update = api.order.updateStatus.useMutation({
    onSuccess: async () => {
      setMode("idle");
      setTrackingNumber("");
      setError(null);
      // Refetch so the row (and the detail page) show the new status.
      await Promise.all([
        utils.order.adminList.invalidate(),
        utils.order.adminGet.invalidate(),
      ]);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (status === "DELIVERED" || status === "CANCELLED") return null;

  function ship() {
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      setError("Enter a tracking number to mark this order as shipped.");
      return;
    }
    setError(null);
    update.mutate({ orderNumber, status: "SHIPPED", trackingNumber: trimmed });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {mode === "idle" && status === "PROCESSING" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setMode("ship")}>
            Mark as shipped
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMode("cancel")}
          >
            Cancel
          </Button>
        </div>
      )}

      {mode === "idle" && status === "SHIPPED" && (
        <Button
          size="sm"
          loading={update.isPending}
          onClick={() => update.mutate({ orderNumber, status: "DELIVERED" })}
        >
          Mark as delivered
        </Button>
      )}

      {mode === "ship" && (
        <form
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ship();
          }}
        >
          <input
            aria-label={`Tracking number for order #${orderNumber}`}
            placeholder="Tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="border-ink bg-paper h-8 w-44 border px-2 font-mono text-xs"
            autoFocus
          />
          <Button type="submit" size="sm" loading={update.isPending}>
            Confirm
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setMode("idle");
              setError(null);
            }}
          >
            Back
          </Button>
        </form>
      )}

      {mode === "cancel" && (
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs">
            Cancel order #{orderNumber}? The items go back into stock.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={update.isPending}
              onClick={() =>
                update.mutate({ orderNumber, status: "CANCELLED" })
              }
            >
              Yes, cancel order
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setMode("idle");
                setError(null);
              }}
            >
              Keep order
            </Button>
          </div>
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
