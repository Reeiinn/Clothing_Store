"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { api } from "~/trpc/react";
import { errorMessage } from "../../_components/error-message";
import { ProductForm } from "../ProductForm";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const utils = api.useUtils();
  const product = api.inventory.product.useQuery({ id });

  const update = api.inventory.updateProduct.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.inventory.invalidate(),
        utils.product.invalidate(),
      ]);
    },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Link href="/products" className="text-sm underline underline-offset-2">
        ← All products
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Edit product</h1>
          <p className="text-muted text-sm">
            Changes show in the store as soon as you save.
          </p>
        </div>
        <Link
          href={`/inventory/${id}`}
          className="text-sm underline underline-offset-2"
        >
          Manage stock →
        </Link>
      </div>

      {product.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load this product: {product.error.message}
        </p>
      )}
      {product.isPending && <p className="text-muted text-sm">Loading…</p>}

      {product.data && (
        <ProductForm
          key={product.data.imageUrl}
          initial={{
            ...product.data,
            categorySlug: product.data.category.slug,
          }}
          submitLabel="Save changes"
          pending={update.isPending}
          error={update.error ? errorMessage(update.error) : null}
          onSubmit={(details) => update.mutate({ id, ...details })}
        />
      )}

      {update.isSuccess && (
        <p role="status" className="text-ok text-sm">
          Changes saved.
        </p>
      )}
    </div>
  );
}
