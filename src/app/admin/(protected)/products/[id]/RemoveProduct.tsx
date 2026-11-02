"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/Button";
import { api } from "~/trpc/react";
import { errorMessage } from "../../_components/error-message";

const dangerBase =
  "border-danger inline-flex h-11 items-center justify-center gap-2 border px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const dangerOutline = `${dangerBase} text-danger hover:bg-danger-bg`;
const dangerSolid = `${dangerBase} bg-danger text-paper hover:bg-danger/85`;

export function RemoveProduct({
  product,
}: {
  product: { id: string; name: string; hidden: boolean; ordered: boolean };
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [confirming, setConfirming] = useState(false);

  async function refresh() {
    await Promise.all([
      utils.inventory.invalidate(),
      utils.product.invalidate(),
    ]);
  }

  const setHidden = api.inventory.setHidden.useMutation({ onSuccess: refresh });
  const remove = api.inventory.deleteProduct.useMutation({
    onSuccess: async () => {
      // Don't refetch here: this page's product query would 404 and retry
      const stale = { refetchType: "none" } as const;
      await Promise.all([
        utils.inventory.invalidate(undefined, stale),
        utils.product.invalidate(undefined, stale),
      ]);
      router.replace("/products");
    },
  });

  const error = setHidden.error ?? remove.error;

  return (
    <section className="border-line flex flex-col gap-6 border-t pt-8">
      <h2 className="text-xl font-semibold">Remove from store</h2>

      <div className="flex flex-col items-start gap-2">
        <h3 className="text-sm font-medium">
          {product.hidden ? "Hidden from the store" : "Hide from the store"}
        </h3>
        <p className="text-muted text-sm">
          {product.hidden
            ? "Customers can't see or buy this product. Show it again whenever you're ready."
            : "Customers won't see it or be able to buy it. Past orders and stock stay as they are, and you can show it again any time."}
        </p>
        <Button
          variant="secondary"
          loading={setHidden.isPending}
          onClick={() =>
            setHidden.mutate({ id: product.id, hidden: !product.hidden })
          }
        >
          {product.hidden ? "Show in store" : "Hide from store"}
        </Button>
      </div>

      <div className="flex flex-col items-start gap-2">
        <h3 className="text-sm font-medium">Delete permanently</h3>
        {product.ordered ? (
          <p className="text-muted text-sm">
            This product has been ordered before, so it can&apos;t be deleted.
            Past orders and returns still need it. Hide it instead.
          </p>
        ) : (
          <p className="text-muted text-sm">
            Removes the product, its photo and all its stock. This can&apos;t be
            undone.
          </p>
        )}

        {!product.ordered &&
          (confirming ? (
            <div
              role="alertdialog"
              aria-label="Confirm delete"
              className="border-danger flex w-full flex-col gap-3 border p-4"
            >
              <p className="text-sm">
                Delete <span className="font-medium">{product.name}</span> for
                good?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: product.id })}
                  className={dangerSolid}
                >
                  {remove.isPending ? "Deleting…" : "Yes, delete it"}
                </button>
                <Button
                  variant="secondary"
                  disabled={remove.isPending}
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={dangerOutline}
            >
              Delete product
            </button>
          ))}
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {errorMessage(error)}
        </p>
      )}
    </section>
  );
}
