import { cx } from "~/lib/cx";

export function ImagePlaceholder({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("bg-placeholder relative overflow-hidden", className)}
    >
      <svg
        className="text-line absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <line
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="100"
          y1="0"
          x2="0"
          y2="100"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
