import Link from "next/link";

import { ProductImage } from "~/components/ProductImage";
import { formatPrice } from "~/lib/format";

type ProductCardProps = {
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  colors: { name: string; hex: string }[];
  sizes: string[];
  tag?: "LOW STOCK" | "SOLD OUT";
};

export function ProductCard({
  slug,
  name,
  priceCents,
  imageUrl,
  colors,
  sizes,
  tag,
}: ProductCardProps) {
  const sizeRange =
    sizes.length > 1 ? `${sizes[0]} – ${sizes.at(-1)}` : sizes[0];

  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className="relative">
        <ProductImage
          src={imageUrl}
          alt=""
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="rounded-ui aspect-[3/4] w-full"
        />
        {tag && (
          <span className="bg-ink text-paper absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 text-sm">
        <h3 className="underline-offset-4 group-hover:underline">{name}</h3>
        <span className="shrink-0 font-medium">{formatPrice(priceCents)}</span>
      </div>
      <div className="text-muted mt-2 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          {colors.slice(0, 4).map((color) => (
            <span
              key={color.name}
              title={color.name}
              style={{ backgroundColor: color.hex }}
              className="border-line size-3 rounded-full border"
            />
          ))}
          <span className="ml-0.5">
            {colors.length} {colors.length === 1 ? "color" : "colors"}
          </span>
        </span>
        {sizeRange && <span className="font-mono">{sizeRange}</span>}
      </div>
    </Link>
  );
}
