"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProductImage } from "~/components/ProductImage";
import { formatPrice } from "~/lib/format";
import { api } from "~/trpc/react";
import { VariantGrid } from "./VariantGrid";

export default function AdminProductPage() {
  const { id } = useParams<{ id: string }>();
  const grid = api.inventory.variantMatrix.useQuery({ productId: id });

  return (
    <div className="flex flex-col gap-8">
      <Link href="/inventory" className="text-sm underline underline-offset-2">
        ← All inventory
      </Link>

      {grid.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load this product: {grid.error.message}
        </p>
      )}

      {grid.data && (
        <div className="flex items-center gap-5">
          <ProductImage
            src={grid.data.imageUrl}
            alt={grid.data.productName}
            sizes="96px"
            className="border-ink size-24 shrink-0 border"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold">{grid.data.productName}</h1>
            <p className="text-muted text-sm">
              {grid.data.category} · {formatPrice(grid.data.priceCents)}
            </p>
          </div>
        </div>
      )}

      <VariantGrid grid={grid.data} loading={grid.isPending} />
    </div>
  );
}
