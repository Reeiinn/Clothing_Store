"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { StatusBadge } from "~/components/StatusBadge";
import { formatPrice } from "~/lib/format";
import { api } from "~/trpc/react";
import { OrderActions } from "../OrderActions";

const th = "px-4 py-3 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-3 text-sm";

function formatDateTime(date: Date) {
  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = Number(params.orderNumber);
  const valid = Number.isInteger(orderNumber) && orderNumber > 0;

  const orderQuery = api.order.adminGet.useQuery(
    { orderNumber },
    { enabled: valid, retry: false },
  );

  const back = (
    <Link href="/admin/orders" className="text-sm underline">
      ← Back to orders
    </Link>
  );

  if (!valid || orderQuery.isPending || orderQuery.isError) {
    const problem = valid
      ? orderQuery.error?.message
      : "That isn't a valid order number.";
    return (
      <div className="flex flex-col gap-4">
        {back}
        {problem ? (
          <p role="alert" className="text-danger text-sm">
            {problem}
          </p>
        ) : (
          <p className="text-muted text-sm">Loading order…</p>
        )}
      </div>
    );
  }

  const order = orderQuery.data;

  return (
    <div className="flex flex-col gap-8">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">Order #{order.number}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-muted text-sm">
            Placed {formatDateTime(order.createdAt)} by{" "}
            {order.user.name ?? "an unnamed customer"} ({order.user.email})
          </p>
          {order.trackingNumber && (
            <p className="text-sm">
              Tracking number:{" "}
              <span className="font-mono">{order.trackingNumber}</span>
            </p>
          )}
        </div>
        <OrderActions orderNumber={order.number} status={order.status} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Items</h2>
        <div className="border-ink overflow-x-auto border">
          <table className="w-full min-w-[36rem] border-collapse">
            <thead className="border-ink bg-placeholder border-b">
              <tr>
                <th className={th}>PRODUCT</th>
                <th className={th}>COLOR / SIZE</th>
                <th className={`${th} text-right`}>QTY</th>
                <th className={`${th} text-right`}>PRICE</th>
                <th className={`${th} text-right`}>LINE TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-line border-b">
                  <td className={`${td} font-medium`}>{item.productName}</td>
                  <td className={td}>
                    {item.colorName} /{" "}
                    <span className="font-mono">{item.size}</span>
                  </td>
                  <td className={`${td} text-right font-mono`}>
                    {item.quantity}
                  </td>
                  <td className={`${td} text-right font-mono`}>
                    {formatPrice(item.unitPriceCents)}
                  </td>
                  <td className={`${td} text-right font-mono`}>
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="text-sm">
              <tr>
                <td colSpan={4} className={`${td} text-muted text-right`}>
                  Subtotal
                </td>
                <td className={`${td} text-right font-mono`}>
                  {formatPrice(order.subtotalCents)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className={`${td} text-muted text-right`}>
                  Shipping ({order.shippingMethod.toLowerCase()})
                </td>
                <td className={`${td} text-right font-mono`}>
                  {formatPrice(order.shippingCents)}
                </td>
              </tr>
              <tr className="border-ink border-t">
                <td colSpan={4} className={`${td} text-right font-semibold`}>
                  Total
                </td>
                <td className={`${td} text-right font-mono font-semibold`}>
                  {formatPrice(order.totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Shipping address</h2>
          <address className="border-ink border p-4 text-sm leading-relaxed not-italic">
            <div className="font-medium">{order.shipFullName}</div>
            <div>{order.shipPhone}</div>
            <div>
              {order.shipStreet}
              {order.shipUnit ? `, ${order.shipUnit}` : ""}
            </div>
            <div>
              {order.shipCity}, {order.shipProvince} {order.shipPostalCode}
            </div>
          </address>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Status history</h2>
          <ol className="border-ink flex flex-col border">
            {order.history.length === 0 && (
              <li className="text-muted p-4 text-sm">No history yet.</li>
            )}
            {order.history.map((entry) => (
              <li
                key={entry.id}
                className="border-line flex flex-col gap-1 border-b p-4 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={entry.status} />
                  <span className="text-muted text-xs">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.note && <p className="text-sm">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
