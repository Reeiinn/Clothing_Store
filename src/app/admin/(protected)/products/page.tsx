"use client";

import Link from "next/link";

import { buttonStyles } from "~/components/Button";
import { ProductImage } from "~/components/ProductImage";
import { formatPrice } from "~/lib/format";
import { api } from "~/trpc/react";

const th = "px-4 py-3 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-3 align-middle text-sm";

export default function AdminProductsPage() {
  const products = api.inventory.products.useQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="text-muted text-sm">
            Everything in the store. Click a product to see and change its
            stock.
          </p>
        </div>
        <Link href="/products/new" className={buttonStyles()}>
          Add product
        </Link>
      </div>

      {products.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load products: {products.error.message}
        </p>
      )}

      <div className="border-ink overflow-x-auto border">
        <table className="w-full min-w-[48rem] border-collapse">
          <thead className="border-ink bg-placeholder border-b">
            <tr>
              <th className={th}>PRODUCT</th>
              <th className={th}>CATEGORY</th>
              <th className={`${th} text-right`}>PRICE</th>
              <th className={th}>COLORS</th>
              <th className={`${th} text-right`}>IN STOCK</th>
              <th className={th}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {products.isPending && (
              <tr>
                <td colSpan={6} className={`${td} text-muted`}>
                  Loading products…
                </td>
              </tr>
            )}
            {products.data?.length === 0 && (
              <tr>
                <td colSpan={6} className={`${td} text-muted`}>
                  No products yet.
                </td>
              </tr>
            )}
            {products.data?.map((product) => (
              <tr
                key={product.id}
                className="border-line hover:bg-ink/5 border-b last:border-b-0"
              >
                <td className={td}>
                  <Link
                    href={`/products/${product.id}`}
                    className="flex items-center gap-3 font-medium underline-offset-2 hover:underline"
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt=""
                      sizes="48px"
                      className="border-line size-12 shrink-0 border"
                    />
                    {product.name}
                  </Link>
                </td>
                <td className={td}>{product.category}</td>
                <td className={`${td} text-right font-mono`}>
                  {formatPrice(product.priceCents)}
                </td>
                <td className={td}>
                  <span className="flex gap-1">
                    {product.colors.map((color) => (
                      <span
                        key={color.name}
                        title={color.name}
                        style={{ backgroundColor: color.hex }}
                        className="border-ink size-4 rounded-full border"
                      />
                    ))}
                  </span>
                </td>
                <td className={`${td} text-right font-mono`}>
                  {product.totalStock}
                </td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1.5">
                    {product.soldOut === 0 && product.low === 0 && (
                      <span className="bg-ok-bg text-ok px-2 py-0.5 font-mono text-xs">
                        ALL IN STOCK
                      </span>
                    )}
                    {product.soldOut > 0 && (
                      <span className="bg-danger-bg text-danger px-2 py-0.5 font-mono text-xs">
                        {product.soldOut} SOLD OUT
                      </span>
                    )}
                    {product.low > 0 && (
                      <span className="bg-warn-bg text-warn px-2 py-0.5 font-mono text-xs">
                        {product.low} LOW
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
