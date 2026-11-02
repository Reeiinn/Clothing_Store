"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/Button";
import { TextField } from "~/components/TextField";
import { SIZES, type SizeCode } from "~/lib/constants";
import { api } from "~/trpc/react";
import { errorMessage } from "../../_components/error-message";

const fieldset = "flex flex-col gap-2";
const legend = "mb-1.5 text-sm";
const checkLabel =
  "border-line has-checked:border-ink has-checked:bg-ink has-checked:text-paper flex h-9 cursor-pointer items-center gap-2 border px-3 text-sm";

export default function NewProductPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const facets = api.product.facets.useQuery();
  const [error, setError] = useState<string | null>(null);

  const create = api.inventory.createProduct.useMutation({
    onSuccess: async ({ id }) => {
      await Promise.all([
        utils.inventory.invalidate(),
        utils.product.invalidate(),
      ]);
      router.push(`/products/${id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = Number(form.get("price"));
    const stock = Number(form.get("stock"));
    if (!(price > 0) || !Number.isInteger(stock) || stock < 0) {
      setError("Enter a price and a whole number for stock.");
      return;
    }
    setError(null);
    create.mutate({
      name: form.get("name") as string,
      description: form.get("description") as string,
      categorySlug: form.get("category") as string,
      gender: form.get("gender") as "MEN" | "WOMEN" | "UNISEX",
      priceCents: Math.round(price * 100),
      colors: form.getAll("colors").map(String),
      sizes: form.getAll("sizes").map(String) as SizeCode[],
      stock,
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Link href="/products" className="text-sm underline underline-offset-2">
        ← All products
      </Link>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold">Add product</h1>
        <p className="text-muted text-sm">
          A stock entry is made for every color and size you pick. The product
          shows in the store right away.
        </p>
      </div>

      {facets.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load categories and colors: {facets.error.message}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-6">
        <TextField label="Name" name="name" required maxLength={100} />

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="border-line focus:border-ink w-full border bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm">
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              className="border-line focus:border-ink h-11 w-full border bg-white px-3 text-sm outline-none"
            >
              {facets.data?.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gender" className="mb-1.5 block text-sm">
              For
            </label>
            <select
              id="gender"
              name="gender"
              className="border-line focus:border-ink h-11 w-full border bg-white px-3 text-sm outline-none"
            >
              <option value="UNISEX">Everyone</option>
              <option value="MEN">Men</option>
              <option value="WOMEN">Women</option>
            </select>
          </div>
          <TextField
            label="Price (₱)"
            name="price"
            type="number"
            min={1}
            step="0.01"
            inputMode="decimal"
            required
          />
          <TextField
            label="Starting stock"
            name="stock"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={0}
            hint="Per color and size. You can change each one later."
            required
          />
        </div>

        <fieldset className={fieldset}>
          <legend className={legend}>Colors</legend>
          <div className="flex flex-wrap gap-2">
            {facets.data?.colors.map((color) => (
              <label key={color.name} className={checkLabel}>
                <input
                  type="checkbox"
                  name="colors"
                  value={color.name}
                  className="sr-only"
                />
                <span
                  style={{ backgroundColor: color.hex }}
                  className="border-ink size-3.5 rounded-full border"
                />
                {color.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={fieldset}>
          <legend className={legend}>Sizes</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <label key={size} className={`${checkLabel} font-mono`}>
                <input
                  type="checkbox"
                  name="sizes"
                  value={size}
                  defaultChecked
                  className="sr-only"
                />
                {size}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}

        <div>
          <Button type="submit" loading={create.isPending}>
            Add product
          </Button>
        </div>
      </form>
    </div>
  );
}
