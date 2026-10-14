import { cx } from "~/lib/cx";

type ColorSwatchProps = {
  name: string;
  hex: string;
  selected?: boolean;
  onClick?: () => void;
};

export function ColorSwatch({
  name,
  hex,
  selected,
  onClick,
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      aria-pressed={selected}
      title={name}
      style={{ backgroundColor: hex }}
      className={cx(
        "border-line ring-offset-paper size-7 rounded-full border ring-offset-2 transition",
        selected ? "ring-ink ring-2" : "hover:ring-line hover:ring-2",
      )}
    />
  );
}
