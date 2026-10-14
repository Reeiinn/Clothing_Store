import { cx } from "~/lib/cx";

type SizeChipProps = {
  size: string;
  selected?: boolean;
  soldOut?: boolean;
  onClick?: () => void;
};

export function SizeChip({ size, selected, soldOut, onClick }: SizeChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soldOut}
      aria-pressed={selected}
      aria-label={soldOut ? `${size}, sold out` : size}
      className={cx(
        "h-10 min-w-12 border px-3 font-mono text-sm transition-colors",
        soldOut
          ? "border-line text-muted cursor-not-allowed line-through"
          : selected
            ? "border-ink bg-ink text-paper"
            : "border-line hover:border-ink",
      )}
    >
      {size}
    </button>
  );
}
