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
    "inline-flex items-center justify-center gap-2 border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary"
      ? "border-ink bg-ink text-paper hover:bg-ink/85"
      : "border-ink bg-transparent text-ink hover:bg-ink/5",
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
