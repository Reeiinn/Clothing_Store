"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "~/components/StatusBadge";
import { formatPrice } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";
import { Pager } from "../_components/Pager";
import { StatusTabs } from "../_components/StatusTabs";
import { OrderActions } from "./OrderActions";

type OrderStatus =
  RouterOutputs["order"]["adminList"]["orders"][number]["status"];
type Tab = "ALL" | OrderStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const th = "px-4 py-3 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-3 align-top text-sm";

export default function AdminOrdersPage() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(1);
  const orders = api.order.adminList.useQuery({
    status: tab === "ALL" ? undefined : tab,
    page,
  });

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Orders</h1>
          <p className="text-muted text-sm">
            Move orders from processing to shipped to delivered
          </p>
        </div>
        <StatusTabs
          label="Filter orders by status"
          tabs={tabs}
          value={tab}
          onChange={changeTab}
        />
      </div>

      {orders.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load orders: {orders.error.message}
        </p>
      )}

      <div className="border-ink overflow-x-auto border">
        <table className="w-full min-w-[56rem] border-collapse">
          <thead className="border-ink bg-placeholder border-b">
            <tr>
              <th className={th}>ORDER #</th>
              <th className={th}>DATE</th>
              <th className={th}>CUSTOMER</th>
              <th className={`${th} text-right`}>ITEMS</th>
              <th className={`${th} text-right`}>TOTAL</th>
              <th className={th}>STATUS</th>
              <th className={`${th} text-right`}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {orders.isPending && (
              <tr>
                <td colSpan={7} className={`${td} text-muted`}>
                  Loading orders…
                </td>
              </tr>
            )}
            {orders.data?.orders.length === 0 && (
              <tr>
                <td colSpan={7} className={`${td} text-muted`}>
                  No orders here yet.
                </td>
              </tr>
            )}
            {orders.data?.orders.map((order) => (
              <tr
                key={order.number}
                className="border-line border-b last:border-b-0"
              >
                <td className={td}>
                  <Link
                    href={`/orders/${order.number}`}
                    className="font-mono underline"
                  >
                    #{order.number}
                  </Link>
                </td>
                <td className={td}>
                  {order.createdAt.toLocaleDateString("en-PH", {
                    dateStyle: "medium",
                  })}
                </td>
                <td className={td}>
                  <div className="font-medium">
                    {order.user.name ?? "Unnamed customer"}
                  </div>
                  <div className="text-muted text-xs">{order.user.email}</div>
                </td>
                <td className={`${td} text-right font-mono`}>
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </td>
                <td className={`${td} text-right font-mono`}>
                  {formatPrice(order.totalCents)}
                </td>
                <td className={td}>
                  <StatusBadge status={order.status} />
                </td>
                <td className={td}>
                  <OrderActions
                    orderNumber={order.number}
                    status={order.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.data && (
        <Pager
          page={page}
          pageSize={orders.data.pageSize}
          total={orders.data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
