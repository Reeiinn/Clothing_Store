import Image from "next/image";

import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { cx } from "~/lib/cx";

// Falls back to the placeholder when a product has no imageUrl.
export function ProductImage({
  src,
  alt,
  sizes,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
}) {
  if (!src) return <ImagePlaceholder label={alt} className={className} />;

  return (
    <div className={cx("bg-placeholder relative overflow-hidden", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}
