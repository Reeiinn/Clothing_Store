import Link from "next/link";

import { Button } from "~/components/Button";
import { ProductImage } from "~/components/ProductImage";
import { formatPrice } from "~/lib/format";
import type { RouterOutputs } from "~/trpc/react";

type Item = RouterOutputs["checkout"]["summary"]["items"][number];

export function CheckoutSummary({
  items,
  subtotalCents,
  shippingCents,
  shippingLabel,
  loading,
}: {
  items: Item[];
  subtotalCents: number;
  shippingCents: number;
  shippingLabel: string;
  loading: boolean;
}) {
  return (
    <aside
      aria-label="Order summary"
      className="border-ink flex w-full flex-col gap-4 border p-6 lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order summary</h2>
        <Link href="/bag" className="text-sm underline underline-offset-2">
          Edit
        </Link>
      </div>

      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 text-sm">
            <ProductImage
              src={item.imageUrl}
              alt={`${item.name}, ${item.color}`}
              sizes="56px"
              className="h-[75px] w-14 shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="font-medium">{item.name}</p>
              <p className="text-muted">
                {item.color} / {item.size} · Qty {item.quantity}
              </p>
            </div>
            <p className="shrink-0">{formatPrice(item.lineTotalCents)}</p>
          </li>
        ))}
      </ul>

      <div className="border-line flex flex-col gap-2.5 border-t pt-4">
        <div className="flex items-center justify-between">
          <p>Subtotal</p>
          <p>{formatPrice(subtotalCents)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p>Shipping · {shippingLabel}</p>
          <p>{formatPrice(shippingCents)}</p>
        </div>
      </div>

      <div className="border-ink flex items-start justify-between border-t pt-4 text-lg font-semibold">
        <p>Total</p>
        <p>{formatPrice(subtotalCents + shippingCents)}</p>
      </div>

      <Button
        type="submit"
        form="checkout-form"
        loading={loading}
        className="w-full"
      >
        {loading ? "Placing order…" : "Place order"}
      </Button>

      <p className="text-muted text-[13px] leading-relaxed">
        Each size and color is taken out of stock when you place your order.
        You&apos;ll get an order number and can track it under Orders.
      </p>
    </aside>
  );
}
