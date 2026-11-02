import { cx } from "~/lib/cx";

import type { FieldName } from "./validation";

type FieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "name" | "id"
> & {
  name: FieldName;
  label: string;
  error?: string;
  hint?: string;
  onValue: (value: string) => void;
};

export function Field({
  name,
  label,
  error,
  hint,
  onValue,
  className,
  ...props
}: FieldProps) {
  const id = `field-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onValue(event.target.value)}
        className={cx(
          "placeholder:text-muted focus:border-ink rounded-ui h-12 w-full border bg-white px-3 text-sm transition-colors outline-none disabled:opacity-60",
          error ? "border-danger" : "border-line",
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-danger mt-1.5 text-xs">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-muted mt-1.5 text-xs">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
