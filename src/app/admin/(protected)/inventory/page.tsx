"use client";

import Link from "next/link";
import { useState } from "react";

import { ProductImage } from "~/components/ProductImage";
import { api } from "~/trpc/react";
import { StatusTabs } from "../_components/StatusTabs";
import { ThresholdControl } from "./ThresholdControl";

type Filter = "ALL" | "SOLD_OUT" | "LOW";

const th = "px-4 py-3 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-3 align-middle text-sm";

const emptyText: Record<Filter, string> = {
  ALL: "No products yet.",
  SOLD_OUT: "Nothing is sold out.",
  LOW: "Nothing is running low.",
};

export default function AdminInventoryPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const products = api.inventory.products.useQuery();
  const threshold = api.inventory.getThreshold.useQuery();

  const all = products.data ?? [];
  const soldOutCount = all.filter((p) => p.soldOut > 0).length;
  const lowCount = all.filter((p) => p.low > 0).length;
  const count = (n: number) => (products.data ? ` (${n})` : "");
  const tabs: { value: Filter; label: string }[] = [
    { value: "ALL", label: `All${count(all.length)}` },
    { value: "SOLD_OUT", label: `Sold out${count(soldOutCount)}` },
    { value: "LOW", label: `Running low${count(lowCount)}` },
  ];

  const rows = all
    .filter((p) =>
      filter === "SOLD_OUT"
        ? p.soldOut > 0
        : filter === "LOW"
          ? p.low > 0
          : true,
    )
    .sort((a, b) => b.soldOut - a.soldOut || b.low - a.low);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="text-muted text-sm">
          Products that need restocking are listed first. Click a product to see
          and change the stock of each size and color.
        </p>
      </div>

      <StatusTabs
        label="Filter by stock level"
        tabs={tabs}
        value={filter}
        onChange={setFilter}
      />

      {products.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load inventory: {products.error.message}
        </p>
      )}

      <div className="border-ink overflow-x-auto border">
        <table className="w-full border-collapse">
          <thead className="border-ink bg-placeholder border-b">
            <tr>
              <th className={th}>PRODUCT</th>
              <th className={`${th} text-right`}>IN STOCK</th>
              <th className={th}>STATUS</th>
              <th className={`${th} hidden sm:table-cell`}>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.isPending && (
              <tr>
                <td colSpan={4} className={`${td} text-muted`}>
                  Loading inventory…
                </td>
              </tr>
            )}
            {products.data && rows.length === 0 && (
              <tr>
                <td colSpan={4} className={`${td} text-muted`}>
                  {emptyText[filter]}
                </td>
              </tr>
            )}
            {rows.map((product) => (
              <tr
                key={product.id}
                className="border-line hover:bg-ink/5 relative border-b last:border-b-0"
              >
                <td className={td}>
                  <span className="flex items-center gap-3">
                    <ProductImage
                      src={product.imageUrl}
                      alt=""
                      sizes="48px"
                      className="border-line hidden size-12 shrink-0 border sm:block"
                    />
                    <span className="flex flex-col">
                      <Link
                        href={`/inventory/${product.id}`}
                        className="focus-visible:after:outline-ink font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2"
                      >
                        {product.name}
                      </Link>
                      <span className="text-muted text-xs">
                        {product.category} · {product.colors.length}{" "}
                        {product.colors.length === 1 ? "color" : "colors"}
                      </span>
                    </span>
                  </span>
                </td>
                <td className={`${td} text-right font-mono`}>
                  {product.totalStock}
                </td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1.5">
                    {product.soldOut === 0 && product.low === 0 && (
                      <span className="bg-ok-bg text-ok px-2 py-0.5 font-mono text-xs whitespace-nowrap">
                        ALL IN STOCK
                      </span>
                    )}
                    {product.soldOut > 0 && (
                      <span className="bg-danger-bg text-danger px-2 py-0.5 font-mono text-xs whitespace-nowrap">
                        {product.soldOut} SOLD OUT
                      </span>
                    )}
                    {product.low > 0 && (
                      <span className="bg-warn-bg text-warn px-2 py-0.5 font-mono text-xs whitespace-nowrap">
                        {product.low} LOW
                      </span>
                    )}
                  </span>
                </td>
                <td
                  className={`${td} text-muted hidden text-right sm:table-cell`}
                  aria-hidden
                >
                  →
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ThresholdControl current={threshold.data?.threshold ?? 3} />
    </div>
  );
}
