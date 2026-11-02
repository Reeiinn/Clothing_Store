"use client";

import Link from "next/link";

import { StatusBadge } from "~/components/StatusBadge";
import { formatDate, formatPrice } from "~/lib/format";
import { api } from "~/trpc/react";

const td = "py-2.5 pr-3 text-sm";

export default function AdminDashboardPage() {
  const overview = api.dashboard.overview.useQuery();
  const data = overview.data;

  const cards = [
    { label: "Orders to ship", value: data?.ordersToShip, href: "/orders" },
    { label: "Returns to review", value: data?.openReturns, href: "/returns" },
    { label: "Sold out", value: data?.soldOutCount, href: "/inventory" },
    { label: "Running low", value: data?.lowStockCount, href: "/inventory" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted text-sm">
          What needs your attention today. Click a box to go there.
        </p>
      </div>

      {overview.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load the dashboard: {overview.error.message}
        </p>
      )}

      <div className="bg-ink text-paper flex flex-wrap items-baseline justify-between gap-2 p-5">
        <p className="text-sm">Sales this month</p>
        <p className="font-mono text-3xl font-semibold">
          {data ? formatPrice(data.salesThisMonthCents) : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border-ink hover:bg-ink/5 flex flex-col gap-1.5 border p-5"
          >
            <p className="text-muted text-sm">{card.label}</p>
            <p className="font-mono text-3xl font-semibold">
              {card.value ?? "—"}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Latest orders" href="/orders" linkLabel="All orders">
          {data?.recentOrders.length === 0 && (
            <p className="text-muted text-sm">No orders yet.</p>
          )}
          <table className="w-full border-collapse">
            <tbody>
              {data?.recentOrders.map((order) => (
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
                    <div>{order.user.name ?? order.user.email}</div>
                    <div className="text-muted text-xs">
                      {formatDate(order.createdAt)}
                    </div>
                  </td>
                  <td className={`${td} text-right font-mono`}>
                    {formatPrice(order.totalCents)}
                  </td>
                  <td className={`${td} pl-4 text-right`}>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Needs stock"
          href="/inventory"
          linkLabel="Go to inventory"
        >
          {data?.needsStock.length === 0 && (
            <p className="text-muted text-sm">Everything is well stocked.</p>
          )}
          <table className="w-full border-collapse">
            <tbody>
              {data?.needsStock.map((item) => (
                <tr
                  key={item.variantId}
                  className="border-line border-b last:border-b-0"
                >
                  <td className={td}>
                    <Link
                      href={`/products/${item.productId}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {item.productName}
                    </Link>
                    <div className="text-muted text-xs">
                      {item.color} · {item.size}
                    </div>
                  </td>
                  <td className={`${td} text-right font-mono`}>
                    {item.stock} left
                  </td>
                  <td className={`${td} pl-4 text-right`}>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-ink flex flex-col gap-3 border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm underline underline-offset-2">
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}
