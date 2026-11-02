"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "~/components/Button";
import { ProductImage } from "~/components/ProductImage";
import { QuantityStepper } from "~/components/QuantityStepper";
import { formatPrice } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

export type BagLineData = RouterOutputs["bag"]["get"]["items"][number];

const linkButton =
  "text-sm underline underline-offset-2 hover:no-underline disabled:cursor-not-allowed disabled:opacity-50";

function useLineActions() {
  const utils = api.useUtils();
  const [error, setError] = useState<string>();

  const refresh = () =>
    Promise.all([utils.bag.get.invalidate(), utils.bag.count.invalidate()]);

  const options = {
    onMutate: () => setError(undefined),
    onSuccess: refresh,
    onError: (e: { message: string }) => {
      setError(e.message);
      void refresh();
    },
  };

  const updateQuantity = api.bag.updateQuantity.useMutation(options);
  const saveForLater = api.bag.saveForLater.useMutation(options);
  const moveToBag = api.bag.moveToBag.useMutation(options);
  const remove = api.bag.remove.useMutation(options);

  const busy =
    updateQuantity.isPending ||
    saveForLater.isPending ||
    moveToBag.isPending ||
    remove.isPending;

  return { error, busy, updateQuantity, saveForLater, moveToBag, remove };
}

function Warning({ text }: { text: string }) {
  return (
    <p className="border-warn bg-warn-bg text-warn inline-block self-start border px-2 py-1 font-mono text-xs">
      {text}
    </p>
  );
}

function RowError({ text }: { text: string }) {
  return (
    <p role="alert" className="text-danger text-sm">
      {text}
    </p>
  );
}

function Details({ line }: { line: BagLineData }) {
  return (
    <>
      <Link
        href={`/products/${line.slug}`}
        className="text-[17px] font-medium hover:underline"
      >
        {line.name}
      </Link>
      <p className="text-muted text-sm">
        Color: {line.color} · Size: {line.size}
      </p>
    </>
  );
}

export function BagLine({ line }: { line: BagLineData }) {
  const { error, busy, updateQuantity, saveForLater, remove } =
    useLineActions();

  return (
    <li className="border-ink flex gap-4 border-t py-6 sm:gap-5">
      <ProductImage
        src={line.imageUrl}
        alt={`${line.name}, ${line.color}`}
        sizes="112px"
        className="h-[110px] w-[82px] shrink-0 sm:h-[149px] sm:w-28"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Details line={line} />
          </div>
          <div className="shrink-0 text-right">
            <p>{formatPrice(line.lineTotalCents)}</p>
            {line.quantity > 1 && (
              <p className="text-muted text-xs">
                {formatPrice(line.unitPriceCents)} each
              </p>
            )}
          </div>
        </div>

        {line.warning && <Warning text={line.warning} />}
        {error && <RowError text={error} />}

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3">
          <QuantityStepper
            value={line.quantity}
            max={line.stock}
            disabled={busy}
            onChange={(quantity) =>
              updateQuantity.mutate({ itemId: line.id, quantity })
            }
          />
          <button
            type="button"
            disabled={busy}
            className={linkButton}
            aria-label={`Save ${line.name} for later`}
            onClick={() => saveForLater.mutate({ itemId: line.id })}
          >
            Save for later
          </button>
          <button
            type="button"
            disabled={busy}
            className={linkButton}
            aria-label={`Remove ${line.name} from your bag`}
            onClick={() => remove.mutate({ itemId: line.id })}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function SavedLine({ line }: { line: BagLineData }) {
  const { error, busy, moveToBag, remove } = useLineActions();

  return (
    <li className="border-line flex flex-col gap-3 border-b py-4">
      <div className="flex items-center gap-4">
        <ProductImage
          src={line.imageUrl}
          alt={`${line.name}, ${line.color}`}
          sizes="64px"
          className="h-[85px] w-16 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Details line={line} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-5">
          <button
            type="button"
            disabled={busy}
            className={linkButton}
            aria-label={`Remove ${line.name} from saved items`}
            onClick={() => remove.mutate({ itemId: line.id })}
          >
            Remove
          </button>
          <Button
            variant="secondary"
            loading={moveToBag.isPending}
            disabled={busy}
            onClick={() => moveToBag.mutate({ itemId: line.id })}
          >
            Move to bag
          </Button>
        </div>
      </div>
      {line.warning && <Warning text={line.warning} />}
      {error && <RowError text={error} />}
    </li>
  );
}
