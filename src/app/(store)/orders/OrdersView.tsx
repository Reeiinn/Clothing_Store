"use client";

import Link from "next/link";
import { useState } from "react";

import { buttonStyles } from "~/components/Button";
import { StatusBadge } from "~/components/StatusBadge";
import { cx } from "~/lib/cx";
import { formatDate, formatPrice } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

import { itemsLabel, OrderTracking } from "./OrderTracking";

type OrderRow = RouterOutputs["order"]["listMine"][number];
type ReturnStatus = RouterOutputs["returns"]["listMine"][number]["status"];
type Tab = "ALL" | OrderRow["status"];

const tabs: Tab[] = ["ALL", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const returnLabels: Record<ReturnStatus, string> = {
  REQUESTED: "Return requested",
  APPROVED: "Return approved",
  RECEIVED: "Return received",
  REJECTED: "Return rejected",
};

export function OrdersView() {
  const [tab, setTab] = useState<Tab>("ALL");
  const all = api.order.listMine.useQuery({});
  const filtered = api.order.listMine.useQuery(
    tab === "ALL" ? {} : { status: tab },
  );
  const returns = api.returns.listMine.useQuery();

  const heading = (
    <h1 className="text-3xl font-semibold sm:text-4xl">My orders</h1>
  );

  if (all.isPending) {
    return (
      <div className="flex flex-col gap-7">
        {heading}
        <p className="text-muted text-sm">Loading your orders…</p>
      </div>
    );
  }
  if (all.isError) {
    return (
      <div className="flex flex-col gap-7">
        {heading}
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load your orders: {all.error.message}
        </p>
      </div>
    );
  }
  if (all.data.length === 0) {
    return (
      <div className="flex flex-col gap-7">
        {heading}
        <div className="border-line flex flex-col items-start gap-4 border-t py-8">
          <p className="text-lg font-medium">
            You haven&apos;t placed any orders
          </p>
          <Link
            href="/products"
            className={buttonStyles({ variant: "primary" })}
          >
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  const featured =
    all.data.find(
      (order) => order.status === "PROCESSING" || order.status === "SHIPPED",
    ) ?? all.data[0]!;

  const returnStatus = new Map<number, ReturnStatus>();
  for (const request of returns.data ?? []) {
    if (!returnStatus.has(request.order.number)) {
      returnStatus.set(request.order.number, request.status);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {heading}

      <OrderTracking orderNumber={featured.orderNumber} />

      <section className="flex flex-col gap-4">
        <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <h2 className="text-2xl font-semibold">Order history</h2>
          <div
            role="group"
            aria-label="Filter orders by status"
            className="flex flex-wrap gap-2"
          >
            {tabs.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === tab}
                onClick={() => setTab(value)}
                className={cx(
                  "min-h-10 rounded-full border px-4 font-mono text-xs tracking-wide transition-colors",
                  value === tab
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink hover:border-ink bg-white",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {filtered.isPending && (
          <p className="text-muted text-sm">Loading orders…</p>
        )}
        {filtered.isError && (
          <p role="alert" className="text-danger text-sm">
            Couldn&apos;t load orders: {filtered.error.message}
          </p>
        )}
        {filtered.data?.length === 0 && (
          <p className="text-muted text-sm">No {tab.toLowerCase()} orders.</p>
        )}
        {filtered.data && filtered.data.length > 0 && (
          <ul>
            {filtered.data.map((order) => (
              <OrderHistoryRow
                key={order.orderNumber}
                order={order}
                returnStatus={returnStatus.get(order.orderNumber)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OrderHistoryRow({
  order,
  returnStatus,
}: {
  order: OrderRow;
  returnStatus?: ReturnStatus;
}) {
  const summary = `${itemsLabel(order.itemCount)} · ${formatPrice(order.totalCents)}`;

  return (
    <li className="border-line grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 border-b py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,2.5fr)]">
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">Order #{order.orderNumber}</p>
        <p className="text-muted text-xs">
          {formatDate(order.createdAt)}
          <span className="sm:hidden"> · {summary}</span>
        </p>
      </div>
      <p className="hidden text-sm sm:block">{itemsLabel(order.itemCount)}</p>
      <p className="hidden text-sm sm:block">{formatPrice(order.totalCents)}</p>
      <div>
        <StatusBadge status={order.status} />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:col-span-1 sm:justify-end">
        <Link
          href={`/orders/${order.orderNumber}`}
          className="underline underline-offset-2 hover:no-underline"
          aria-label={`View details for order #${order.orderNumber}`}
        >
          View details
        </Link>
        {returnStatus ? (
          <span className="text-muted">{returnLabels[returnStatus]}</span>
        ) : (
          order.canRequestReturn && (
            <Link
              href={`/orders/${order.orderNumber}/return`}
              className="font-semibold underline underline-offset-2 hover:no-underline"
              aria-label={`Request a return for order #${order.orderNumber}`}
            >
              Request a return
            </Link>
          )
        )}
      </div>
    </li>
  );
}
