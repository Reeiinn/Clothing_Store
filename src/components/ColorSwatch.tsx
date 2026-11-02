import { cx } from "~/lib/cx";

type ColorSwatchProps = {
  name: string;
  hex: string;
  selected?: boolean;
  soldOut?: boolean;
  onClick?: () => void;
};

export function ColorSwatch({
  name,
  hex,
  selected,
  soldOut,
  onClick,
}: ColorSwatchProps) {
  const label = soldOut ? `${name}, sold out` : name;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      style={{ backgroundColor: hex }}
      className={cx(
        "border-line ring-offset-paper relative size-7 overflow-hidden rounded-full border ring-offset-2 transition",
        selected ? "ring-ink ring-2" : "hover:ring-line hover:ring-2",
      )}
    >
      {soldOut && (
        <span
          aria-hidden
          className="bg-paper/60 absolute inset-0 flex items-center justify-center"
        >
          <span className="bg-ink h-px w-[140%] -rotate-45" />
        </span>
      )}
    </button>
  );
}
