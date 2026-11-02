import Link from "next/link";

import { Button, buttonStyles } from "~/components/Button";
import { cx } from "~/lib/cx";
import { formatPrice } from "~/lib/format";

export function OrderSummary({
  itemCount,
  subtotalCents,
  hasStockProblem,
}: {
  itemCount: number;
  subtotalCents: number;
  hasStockProblem: boolean;
}) {
  const canCheckout = itemCount > 0 && !hasStockProblem;

  return (
    <aside
      aria-label="Order summary"
      className="border-line rounded-ui flex w-full flex-col gap-4 border bg-white p-6 lg:sticky lg:top-24 lg:w-[340px] lg:shrink-0"
    >
      <h2 className="text-xl font-semibold">Order summary</h2>

      <div className="flex items-center justify-between">
        <p>
          Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
        </p>
        <p>{formatPrice(subtotalCents)}</p>
      </div>

      <div className="flex items-center justify-between">
        <p>Shipping</p>
        <p className="text-muted">At checkout</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="promo-code" className="text-sm">
          Promo code
        </label>
        <div className="flex gap-2">
          <input
            id="promo-code"
            disabled
            placeholder="Coming soon"
            className="border-line placeholder:text-muted rounded-ui h-11 min-w-0 flex-1 border bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button variant="secondary" disabled>
            Apply
          </Button>
        </div>
      </div>

      <div className="border-line flex items-start justify-between border-t pt-4 text-lg font-semibold">
        <p>Estimated total</p>
        <p>{formatPrice(subtotalCents)}</p>
      </div>

      {canCheckout ? (
        <Link
          href="/checkout"
          className={cx(buttonStyles({ variant: "primary" }), "w-full")}
        >
          Checkout
        </Link>
      ) : (
        <Button disabled className="w-full">
          Checkout
        </Button>
      )}
      {hasStockProblem && (
        <p role="alert" className="text-danger text-center text-sm">
          Lower the quantity on the items marked above to check out.
        </p>
      )}

      <Link
        href="/products"
        className="self-center text-sm underline underline-offset-2 hover:no-underline"
      >
        Continue shopping
      </Link>
    </aside>
  );
}
