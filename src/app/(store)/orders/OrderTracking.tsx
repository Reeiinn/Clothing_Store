"use client";

import { useState } from "react";

import { Button } from "~/components/Button";
import { ProductImage } from "~/components/ProductImage";
import { StatusBadge } from "~/components/StatusBadge";
import { cx } from "~/lib/cx";
import { formatDate, formatDateTime, formatPrice } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Order = RouterOutputs["order"]["byNumber"];

export function itemsLabel(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

export function OrderTracking({
  orderNumber,
  initialData,
}: {
  orderNumber: number;
  initialData?: Order;
}) {
  const order = api.order.byNumber.useQuery(
    { orderNumber },
    { initialData, retry: false },
  );

  if (order.isPending) {
    return (
      <div className="border-ink text-muted border p-6 text-sm">
        Loading order…
      </div>
    );
  }
  if (order.isError) {
    return (
      <p role="alert" className="text-danger text-sm">
        Couldn&apos;t load order #{orderNumber}: {order.error.message}
      </p>
    );
  }

  const data = order.data;
  const itemCount = data.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="border-ink border">
      <div className="border-ink bg-placeholder flex flex-wrap items-start justify-between gap-3 border-b px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Order #{data.number}</h2>
          <p className="text-muted text-sm">
            Placed {formatDate(data.createdAt)} · {itemsLabel(itemCount)} ·{" "}
            {formatPrice(data.totalCents)}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="flex flex-col gap-8 px-4 py-6 sm:px-6">
        {data.status === "CANCELLED" ? (
          <CancelledNotice order={data} />
        ) : (
          <ProgressTracker order={data} />
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <StatusHistory history={data.history} />

          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-3">
              <h3 className="font-semibold">Items</h3>
              <ul className="flex flex-col gap-3">
                {data.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4">
                    <ProductImage
                      src={item.variant.product.imageUrl}
                      alt={`${item.productName}, ${item.colorName}`}
                      sizes="56px"
                      className="h-[75px] w-14 shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-muted text-sm">
                        {item.colorName} / {item.size} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm">
                      {formatPrice(item.unitPriceCents * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {data.status === "PROCESSING" && (
              <CancelOrder orderNumber={data.number} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const steps = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

function ProgressTracker({ order }: { order: Order }) {
  const current = steps.indexOf(order.status as (typeof steps)[number]);
  const dates = [order.createdAt, order.shippedAt, order.deliveredAt];

  return (
    <ol className="flex flex-col sm:flex-row">
      {steps.map((step, i) => {
        const reached = i <= current;
        const inProgress = i === current && step !== "DELIVERED";
        const date = dates[i];

        return (
          <li
            key={step}
            className="relative flex gap-4 pb-6 last:pb-0 sm:flex-1 sm:flex-col sm:gap-3 sm:pb-0"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cx(
                  "absolute top-6 bottom-0 left-[11px] w-0.5 sm:top-[11px] sm:right-0 sm:bottom-auto sm:left-6 sm:h-0.5 sm:w-auto",
                  i < current ? "bg-ink" : "bg-line",
                )}
              />
            )}
            <span
              aria-hidden
              className={cx(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full",
                !reached && "border-line bg-paper border-2",
                inProgress && "border-ink bg-paper border-[5px]",
                reached && !inProgress && "bg-ink text-paper text-xs",
              )}
            >
              {reached && !inProgress && "✓"}
            </span>
            <div className="flex flex-col gap-1.5">
              <p
                className={cx(
                  "font-mono text-xs tracking-wide",
                  !reached && "text-muted",
                )}
              >
                {step}
                <span className="sr-only">
                  {reached ? (inProgress ? " (current)" : " (done)") : ""}
                </span>
              </p>
              <p className="text-muted text-sm">
                {reached && date
                  ? formatDate(date)
                  : step === "DELIVERED"
                    ? `Est. ${formatDate(order.estimatedDelivery)}`
                    : "—"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CancelledNotice({ order }: { order: Order }) {
  const cancelled = order.history.find((entry) => entry.status === "CANCELLED");

  return (
    <div className="border-line flex flex-col gap-1 border p-4">
      <p className="font-medium">This order was cancelled</p>
      {cancelled && (
        <p className="text-muted text-sm">
          Cancelled on {formatDate(cancelled.createdAt)}
        </p>
      )}
    </div>
  );
}

function StatusHistory({ history }: { history: Order["history"] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Status history</h3>
      {history.length === 0 ? (
        <p className="text-muted text-sm">No updates yet.</p>
      ) : (
        <ol className="border-ink flex flex-col gap-4 border-l-2 pl-4">
          {history.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-0.5">
              <time
                dateTime={entry.createdAt.toISOString()}
                className="text-muted font-mono text-xs"
              >
                {formatDateTime(entry.createdAt)}
              </time>
              <p className="text-sm font-medium">
                {entry.note ?? entry.status}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CancelOrder({ orderNumber }: { orderNumber: number }) {
  const utils = api.useUtils();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();

  const cancel = api.order.cancel.useMutation({
    onMutate: () => setError(undefined),
    onSuccess: async () => {
      setConfirming(false);
      await Promise.all([
        utils.order.byNumber.invalidate({ orderNumber }),
        utils.order.listMine.invalidate(),
      ]);
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div className="flex flex-col items-start gap-3">
      {confirming ? (
        <>
          <p className="text-sm">
            Are you sure? Order #{orderNumber} will be cancelled and can&apos;t
            be restored.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              loading={cancel.isPending}
              onClick={() => cancel.mutate({ orderNumber })}
            >
              Yes, cancel order
            </Button>
            <Button
              variant="secondary"
              disabled={cancel.isPending}
              onClick={() => {
                setConfirming(false);
                setError(undefined);
              }}
            >
              Keep order
            </Button>
          </div>
        </>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Cancel order
        </Button>
      )}
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
