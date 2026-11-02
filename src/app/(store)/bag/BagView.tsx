"use client";

import Link from "next/link";

import { buttonStyles } from "~/components/Button";
import { api } from "~/trpc/react";

import { BagLine, SavedLine } from "./BagLine";
import { OrderSummary } from "./OrderSummary";

export function BagView() {
  const bag = api.bag.get.useQuery();

  if (bag.isPending) {
    return <p className="text-muted text-sm">Loading your bag…</p>;
  }
  if (bag.isError) {
    return (
      <p role="alert" className="text-danger text-sm">
        Couldn&apos;t load your bag: {bag.error.message}
      </p>
    );
  }

  const { items, saved, itemCount, subtotalCents } = bag.data;
  const hasStockProblem = items.some((line) => line.quantity > line.stock);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Your bag</h1>
        <p className="text-muted font-mono text-sm">
          {itemCount} {itemCount === 1 ? "item" : "items"} · Saved to your
          account
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {items.length === 0 ? (
            <div className="border-ink flex flex-col items-start gap-4 border-t py-8">
              <p className="text-lg font-medium">Your bag is empty</p>
              <Link
                href="/products"
                className={buttonStyles({ variant: "primary" })}
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <ul>
              {items.map((line) => (
                <BagLine key={line.id} line={line} />
              ))}
            </ul>
          )}

          {saved.length > 0 && (
            <section className="border-ink flex flex-col gap-2 border-t pt-6">
              <h2 className="text-xl font-semibold">Saved for later</h2>
              <ul>
                {saved.map((line) => (
                  <SavedLine key={line.id} line={line} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <OrderSummary
          itemCount={itemCount}
          subtotalCents={subtotalCents}
          hasStockProblem={hasStockProblem}
        />
      </div>
    </div>
  );
}
