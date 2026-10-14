"use client";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Infinity,
  disabled = false,
}: QuantityStepperProps) {
  const buttonClass =
    "size-9 text-lg transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="border-line inline-flex items-center border">
      <button
        type="button"
        aria-label="Decrease quantity"
        className={buttonClass}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span aria-live="polite" className="w-8 text-center font-mono text-sm">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        className={buttonClass}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
