"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { TextField } from "~/components/TextField";
import { SIZES, type SizeCode } from "~/lib/constants";
import { api } from "~/trpc/react";
import { errorMessage } from "../../_components/error-message";
import { ProductForm } from "../ProductForm";

const fieldset = "flex flex-col gap-2";
const legend = "mb-1.5 text-sm";
const checkLabel =
  "border-line has-checked:border-ink has-checked:bg-ink has-checked:text-paper flex h-9 cursor-pointer items-center gap-2 border px-3 text-sm";

export default function NewProductPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const facets = api.product.facets.useQuery();

  const create = api.inventory.createProduct.useMutation({
    onSuccess: async ({ id }) => {
      await Promise.all([
        utils.inventory.invalidate(),
        utils.product.invalidate(),
      ]);
      router.push(`/inventory/${id}`);
    },
  });

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

      <ProductForm
        submitLabel="Add product"
        pending={create.isPending}
        error={create.error ? errorMessage(create.error) : null}
        onSubmit={(details, form) => {
          const stock = Number(form.get("stock"));
          if (!Number.isInteger(stock) || stock < 0) {
            return "Enter a whole number for stock.";
          }
          create.mutate({
            ...details,
            colors: form.getAll("colors").map(String),
            sizes: form.getAll("sizes").map(String) as SizeCode[],
            stock,
          });
        }}
      >
        <TextField
          label="Starting stock"
          name="stock"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={0}
          hint="Per color and size. You can change each one later in Inventory."
          required
        />

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
      </ProductForm>
    </div>
  );
}
