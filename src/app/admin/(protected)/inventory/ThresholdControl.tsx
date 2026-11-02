"use client";

import { useEffect, useState } from "react";

import { Button } from "~/components/Button";
import { api } from "~/trpc/react";
import { errorMessage } from "../_components/error-message";

export function ThresholdControl({ current }: { current: number }) {
  const utils = api.useUtils();
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(String(current));
  }, [current]);

  const save = api.inventory.setThreshold.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.inventory.invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const threshold = Number(value);
    if (value.trim() === "" || !Number.isInteger(threshold)) {
      setError("Enter a whole number.");
      return;
    }
    setError(null);
    save.mutate({ threshold });
  }

  return (
    <form
      onSubmit={submit}
      className="border-line flex flex-col items-start gap-1.5 border-t pt-6"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="stock-threshold">Mark as running low when</label>
        <input
          id="stock-threshold"
          type="number"
          min={0}
          max={1000}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border-ink bg-paper h-11 w-20 border px-3 font-mono text-sm"
        />
        <span>or fewer are left</span>
        <Button type="submit" variant="secondary" loading={save.isPending}>
          Save
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
