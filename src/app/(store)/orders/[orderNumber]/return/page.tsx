import { TRPCError } from "@trpc/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "~/components/Breadcrumb";
import { buttonStyles } from "~/components/Button";
import { StatusBadge } from "~/components/StatusBadge";
import { formatDate } from "~/lib/format";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

import { ReturnForm } from "./ReturnForm";

export default async function ReturnPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber: param } = await params;

  const session = await auth();
  if (!session) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/orders/${param}/return`)}`,
    );
  }

  const orderNumber = Number(param);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) notFound();

  const [order, eligibility] = await Promise.all([
    api.order.byNumber({ orderNumber }),
    api.returns.eligibility({ orderNumber }),
  ]).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const prices = new Map(
    order.items.map((item) => [item.id, item.unitPriceCents]),
  );
  const items = eligibility.items.map((item) => ({
    ...item,
    unitPriceCents: prices.get(item.orderItemId) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "My orders", href: "/orders" },
            { label: `Order #${orderNumber}`, href: `/orders/${orderNumber}` },
            { label: "Return" },
          ]}
        />
        <h1 className="text-3xl font-semibold sm:text-4xl">Request a return</h1>
        <p className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>Order #{orderNumber}</span>
          <span aria-hidden>·</span>
          <StatusBadge status={order.status} />
          <span aria-hidden>·</span>
          <span>{formatDate(order.deliveredAt ?? order.createdAt)}</span>
          {eligibility.returnWindowEndsAt && (
            <>
              <span aria-hidden>·</span>
              <span>
                Returns accepted until{" "}
                {formatDate(eligibility.returnWindowEndsAt)}
              </span>
            </>
          )}
        </p>
      </div>

      {eligibility.eligible ? (
        <ReturnForm orderNumber={orderNumber} items={items} />
      ) : (
        <div className="border-line rounded-ui flex flex-col items-start gap-4 border bg-white p-6 sm:p-8">
          <p className="text-lg font-medium">
            This order can&apos;t be returned
          </p>
          <p className="text-muted text-sm">{eligibility.reason}</p>
          <Link
            href={`/orders/${orderNumber}`}
            className={buttonStyles({ variant: "secondary" })}
          >
            Back to order #{orderNumber}
          </Link>
        </div>
      )}
    </div>
  );
}
