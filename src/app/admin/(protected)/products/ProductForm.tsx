"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "~/components/Button";
import { ProductImage } from "~/components/ProductImage";
import { TextField } from "~/components/TextField";
import { api } from "~/trpc/react";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
type Gender = "MEN" | "WOMEN" | "UNISEX";

export type ProductDetails = {
  name: string;
  description: string;
  categorySlug: string;
  gender: Gender;
  priceCents: number;
  image?: { data: string; type: ImageType };
};

const select =
  "border-line focus:border-ink h-11 w-full border bg-white px-3 text-sm outline-none";

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]!);
    reader.onerror = () => reject(new Error("Couldn't read the photo."));
    reader.readAsDataURL(file);
  });
}

export function ProductForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  children,
}: {
  initial?: Omit<ProductDetails, "image"> & { imageUrl: string | null };
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (details: ProductDetails, form: FormData) => string | void;
  children?: React.ReactNode;
}) {
  const facets = api.product.facets.useQuery();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type as ImageType)) {
      setImageError("Use a JPG, PNG or WebP photo.");
      return;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      setImageError("Photo must be 2 MB or smaller.");
      return;
    }
    setImageError(null);
    setFile(picked);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = Number(form.get("price"));
    if (!(price > 0)) {
      setFormError("Enter a price.");
      return;
    }
    let image: ProductDetails["image"];
    if (file) {
      try {
        image = {
          data: await readAsBase64(file),
          type: file.type as ImageType,
        };
      } catch (e) {
        setFormError((e as Error).message);
        return;
      }
    }
    const details: ProductDetails = {
      name: form.get("name") as string,
      description: form.get("description") as string,
      categorySlug: form.get("category") as string,
      gender: form.get("gender") as Gender,
      priceCents: Math.round(price * 100),
      image,
    };
    setFormError(onSubmit(details, form) ?? null);
  }

  if (facets.isError) {
    return (
      <p role="alert" className="text-danger text-sm">
        Couldn&apos;t load categories and colors: {facets.error.message}
      </p>
    );
  }
  if (!facets.data) return <p className="text-muted text-sm">Loading…</p>;

  const shownError = formError ?? error;
  const hasImage = Boolean(preview ?? initial?.imageUrl);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm">Photo</span>
        <div className="flex items-center gap-4">
          {preview ? (
            <div className="border-line bg-placeholder relative size-32 shrink-0 overflow-hidden border">
              <Image
                src={preview}
                alt="New photo"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <ProductImage
              src={initial?.imageUrl}
              alt={initial ? initial.name : "No photo yet"}
              sizes="128px"
              className="border-line size-32 shrink-0 border"
            />
          )}
          <div className="flex flex-col items-start gap-1.5">
            <label className="border-ink hover:bg-ink/5 has-focus-visible:ring-ink inline-flex h-8 cursor-pointer items-center border px-3 text-xs font-medium has-focus-visible:ring-2 has-focus-visible:ring-offset-2">
              {hasImage ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                onChange={pickImage}
                className="sr-only"
              />
            </label>
            <p className="text-muted text-xs">JPG, PNG or WebP, up to 2 MB.</p>
            {imageError && (
              <p role="alert" className="text-danger text-xs">
                {imageError}
              </p>
            )}
          </div>
        </div>
      </div>

      <TextField
        label="Name"
        name="name"
        required
        maxLength={100}
        defaultValue={initial?.name}
      />

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={initial?.description}
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
            defaultValue={initial?.categorySlug}
            className={select}
          >
            {facets.data.categories.map((c) => (
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
            defaultValue={initial?.gender ?? "UNISEX"}
            className={select}
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
          defaultValue={initial ? initial.priceCents / 100 : undefined}
        />
      </div>

      {children}

      {shownError && (
        <p role="alert" className="text-danger text-sm">
          {shownError}
        </p>
      )}

      <div>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
