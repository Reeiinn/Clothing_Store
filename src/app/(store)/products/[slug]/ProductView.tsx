"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Breadcrumb } from "~/components/Breadcrumb";
import { Button } from "~/components/Button";
import { ColorSwatch } from "~/components/ColorSwatch";
import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { ProductImage } from "~/components/ProductImage";
import { QuantityStepper } from "~/components/QuantityStepper";
import { SizeChip } from "~/components/SizeChip";
import { type SizeCode } from "~/lib/constants";
import { cx } from "~/lib/cx";
import { formatPrice } from "~/lib/format";
import { stockStatus } from "~/lib/stock";
import { deliveryOptions } from "~/server/shipping";
import { api, type RouterOutputs } from "~/trpc/react";

import { SizeGuide } from "./SizeGuide";

type Product = RouterOutputs["product"]["bySlug"];

const genders = {
  MEN: { label: "Men's", param: "men" },
  WOMEN: { label: "Women's", param: "women" },
  UNISEX: { label: "Unisex", param: undefined },
} as const;

const standard = deliveryOptions[0];
const SHIPPING_TIME = `Ships in ${standard.minDays}–${standard.maxDays} business days`;

export function ProductView({
  product,
  signedIn,
}: {
  product: Product;
  signedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const utils = api.useUtils();

  const first =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [color, setColor] = useState(first?.color ?? "");
  const [size, setSize] = useState<SizeCode | undefined>(first?.size);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  const variantOf = (c: string, s: SizeCode | undefined) =>
    product.variants.find((v) => v.color === c && v.size === s);
  const variant = variantOf(color, size);
  const stock = variant?.stock ?? 0;
  const threshold = product.lowStockThreshold;
  const label = `${color} / ${size}`;

  const addToBag = api.bag.add.useMutation({
    onSuccess: (result) => {
      setMessage({
        ok: true,
        text: result.capped
          ? `Added to bag. That's all we have in ${label}.`
          : "Added to bag",
      });
      void utils.bag.count.invalidate();
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") goToLogin();
      else setMessage({ ok: false, text: error.message });
    },
  });

  function goToLogin() {
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  function select(c: string, s: SizeCode) {
    setColor(c);
    setSize(s);
    setQuantity(1);
    setMessage(undefined);
  }

  function onAdd() {
    if (!signedIn) return goToLogin();
    if (variant) addToBag.mutate({ variantId: variant.id, quantity });
  }

  const gender = genders[product.gender];
  const categoryHref = `/products?${new URLSearchParams({
    ...(gender.param && { gender: gender.param }),
    category: product.category.slug,
  }).toString()}`;
  const crumbs: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
  ];
  if (gender.param) {
    crumbs.push({
      label: gender.label,
      href: `/products?gender=${gender.param}`,
    });
  }
  crumbs.push(
    { label: product.category.name, href: categoryHref },
    { label: product.name },
  );

  const status = {
    SOLD_OUT: {
      dot: "bg-danger",
      title: `Sold out in ${label}`,
      detail: undefined,
    },
    LOW: {
      dot: "bg-warn",
      title: `Only ${stock} left in ${label}`,
      detail: SHIPPING_TIME,
    },
    OK: {
      dot: "bg-ok",
      title: "In stock",
      detail: `${label} · ${SHIPPING_TIME}`,
    },
  }[stockStatus(stock, threshold)];

  return (
    <div>
      <Breadcrumb items={crumbs} />

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="relative">
          {product.imageUrl ? (
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="rounded-ui aspect-[4/5] w-full"
            />
          ) : (
            <>
              <ImagePlaceholder
                label={`Photo · ${color}`}
                className="rounded-ui aspect-[4/5] w-full"
              />
              <span
                aria-hidden
                className="bg-paper border-line absolute bottom-4 left-4 rounded-full border px-3 py-1 font-mono text-xs"
              >
                Photo · {color}
              </span>
            </>
          )}
        </div>

        <div>
          <p className="text-muted font-mono text-xs tracking-widest uppercase">
            {gender.label} · {product.category.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-medium">
            {formatPrice(product.priceCents)}
          </p>

          <div className="mt-8">
            <p className="text-sm">
              Color: <span className="font-semibold">{color}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.colors.map((c) => (
                <ColorSwatch
                  key={c.name}
                  name={c.name}
                  hex={c.hex}
                  selected={c.name === color}
                  soldOut={!variantOf(c.name, size)?.stock}
                  onClick={() => size && select(c.name, size)}
                />
              ))}
            </div>
          </div>

          <div className="mt-7">
            <p className="text-sm">
              Size: <span className="font-semibold">{size}</span>
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.sizes.map((s) => (
                <SizeChip
                  key={s}
                  size={s}
                  selected={s === size}
                  soldOut={!variantOf(color, s)?.stock}
                  onClick={() => select(color, s)}
                />
              ))}
            </div>
            <div className="mt-3">
              <SizeGuide />
            </div>
          </div>

          <div
            aria-live="polite"
            className="border-line rounded-ui mt-7 flex gap-3 border bg-white px-4 py-4"
          >
            <span
              aria-hidden
              className={cx(
                "mt-1.5 size-2.5 shrink-0 rounded-full",
                status.dot,
              )}
            />
            <div>
              <p className="text-sm font-semibold">{status.title}</p>
              {status.detail && (
                <p className="text-muted mt-0.5 text-sm">{status.detail}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(stock, 1)}
              disabled={stock === 0}
            />
            <Button
              className="flex-1"
              disabled={stock === 0}
              loading={addToBag.isPending}
              onClick={onAdd}
            >
              {stock === 0 ? "Sold out" : "Add to bag"}
            </Button>
          </div>
          {message && (
            <p
              role="status"
              className={cx(
                "mt-3 text-sm",
                message.ok ? "text-ok" : "text-danger",
              )}
            >
              {message.text}
            </p>
          )}

          <div className="border-line mt-8 border-t">
            <Section title="Details & fabric">
              <p>{product.description}</p>
              {product.fabric && (
                <p className="mt-2">Fabric: {product.fabric}</p>
              )}
            </Section>
            <Section title="Fit & sizing">
              <p>{product.fitNotes}</p>
            </Section>
            <Section title="Shipping & returns">
              <p>
                {SHIPPING_TIME}. See{" "}
                <Link href="/shipping" className="underline underline-offset-4">
                  Shipping
                </Link>{" "}
                and{" "}
                <Link href="/returns" className="underline underline-offset-4">
                  Returns
                </Link>{" "}
                for details.
              </p>
            </Section>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">
            Availability by size and color
          </h2>
          <p className="text-muted text-sm">
            Tap a cell to pick that combination
          </p>
        </div>
        <div className="border-line rounded-ui mt-4 overflow-x-auto border bg-white">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-placeholder">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-mono font-normal"
                >
                  Color
                </th>
                {product.sizes.map((s) => (
                  <th
                    key={s}
                    scope="col"
                    className="py-3 font-mono font-normal"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.colors.map((c) => (
                <tr key={c.name} className="border-line border-t">
                  <th scope="row" className="px-4 py-1.5 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        style={{ backgroundColor: c.hex }}
                        className="border-line size-3.5 shrink-0 rounded-full border"
                      />
                      {c.name}
                    </span>
                  </th>
                  {product.sizes.map((s) => {
                    const v = variantOf(c.name, s);
                    if (!v) return <td key={s} />;
                    const level = stockStatus(v.stock, threshold);
                    const text = {
                      SOLD_OUT: "Sold out",
                      LOW: `${v.stock} left`,
                      OK: "In stock",
                    }[level];
                    const picked = c.name === color && s === size;
                    return (
                      <td key={s} className="p-1.5">
                        <button
                          type="button"
                          aria-pressed={picked}
                          aria-label={`${c.name} / ${s}: ${text}`}
                          onClick={() => select(c.name, s)}
                          className={cx(
                            "rounded-ui h-10 w-full border font-mono text-xs transition-colors",
                            {
                              SOLD_OUT: "bg-line/60 text-muted",
                              LOW: "bg-placeholder",
                              OK: "bg-white",
                            }[level],
                            picked
                              ? "border-ink border-2"
                              : level === "OK"
                                ? "border-line hover:border-ink"
                                : "hover:border-ink border-transparent",
                          )}
                        >
                          {text}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-line border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span
          aria-hidden
          className="text-lg transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="text-muted pb-5 text-sm">{children}</div>
    </details>
  );
}
