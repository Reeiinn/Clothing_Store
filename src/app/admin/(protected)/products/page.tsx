"use client";

import Link from "next/link";

import { buttonStyles } from "~/components/Button";
import { ProductImage } from "~/components/ProductImage";
import { formatPrice } from "~/lib/format";
import { api } from "~/trpc/react";

const th = "px-4 py-3 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-3 align-middle text-sm";

const genderLabel = { MEN: "Men", WOMEN: "Women", UNISEX: "Everyone" } as const;

export default function AdminProductsPage() {
  const products = api.inventory.products.useQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="text-muted text-sm">
            Everything sold in the store. Click a product to edit it. To change
            stock, go to{" "}
            <Link
              href="/inventory"
              className="text-ink underline underline-offset-2"
            >
              Inventory
            </Link>
            .
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
              <th className={th}>FOR</th>
              <th className={`${th} text-right`}>PRICE</th>
              <th className={th}>COLORS</th>
              <th className={th}>SIZES</th>
              <th className={th}>
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.isPending && (
              <tr>
                <td colSpan={7} className={`${td} text-muted`}>
                  Loading products…
                </td>
              </tr>
            )}
            {products.data?.length === 0 && (
              <tr>
                <td colSpan={7} className={`${td} text-muted`}>
                  No products yet.
                </td>
              </tr>
            )}
            {products.data?.map((product) => (
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
                      className="border-line size-12 shrink-0 border"
                    />
                    <Link
                      href={`/products/${product.id}`}
                      className="focus-visible:after:outline-ink font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2"
                    >
                      {product.name}
                    </Link>
                  </span>
                </td>
                <td className={td}>{product.category}</td>
                <td className={td}>{genderLabel[product.gender]}</td>
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
                <td className={`${td} font-mono text-xs`}>
                  {product.sizes.join(" ")}
                </td>
                <td className={`${td} text-muted text-right`} aria-hidden>
                  →
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
