import { cx } from "~/lib/cx";

type Tab<T extends string> = { value: T; label: string };

export function StatusTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-ink inline-flex border"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cx(
            "min-h-10 px-4 text-sm transition-colors",
            tab.value === value
              ? "bg-ink text-paper"
              : "bg-paper text-ink hover:bg-ink/5",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
