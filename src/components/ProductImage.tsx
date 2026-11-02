import Image from "next/image";

import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { cx } from "~/lib/cx";

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
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </div>
  );
}
