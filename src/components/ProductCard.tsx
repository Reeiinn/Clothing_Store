import Link from "next/link";

import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { formatPrice } from "~/lib/format";

type ProductCardProps = {
  slug: string;
  name: string;
  priceCents: number;
  colors: { name: string; hex: string }[];
  sizes: string[];
  tag?: "LOW STOCK" | "SOLD OUT";
};

export function ProductCard({
  slug,
  name,
  priceCents,
  colors,
  sizes,
  tag,
}: ProductCardProps) {
  const sizeRange =
    sizes.length > 1 ? `${sizes[0]} – ${sizes.at(-1)}` : sizes[0];

  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className="relative">
        <ImagePlaceholder className="aspect-[3/4] w-full" />
        {tag && (
          <span className="bg-paper border-line absolute top-2 left-2 border px-1.5 py-0.5 font-mono text-[11px] tracking-wide">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 text-sm">
        <h3 className="group-hover:underline">{name}</h3>
        <span className="shrink-0">{formatPrice(priceCents)}</span>
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
