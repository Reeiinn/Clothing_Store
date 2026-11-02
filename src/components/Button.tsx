import { cx } from "~/lib/cx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
  loading?: boolean;
};

export function buttonStyles({
  variant = "primary",
  size = "md",
}: Pick<ButtonProps, "variant" | "size"> = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-ui border font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
    variant === "primary"
      ? "border-ink bg-ink text-paper hover:bg-ink/85"
      : "border-line bg-white text-ink hover:border-ink",
    size === "md" ? "h-11 px-6 text-sm" : "h-8 px-3 text-xs",
  );
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cx(buttonStyles({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
