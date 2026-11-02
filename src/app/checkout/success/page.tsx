import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buttonStyles } from "~/components/Button";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  const session = await auth();
  if (!session) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/checkout/success?order=${order ?? ""}`)}`,
    );
  }

  const orderNumber = Number(order);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) notFound();

  const found = await db.order.findFirst({
    where: { number: orderNumber, userId: session.user.id },
    select: { number: true },
  });
  if (!found) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-6 py-10">
      <p className="border-ok text-ok flex size-12 items-center justify-center rounded-full border-2 text-2xl">
        ✓
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Thank you! Order #{found.number} is confirmed
        </h1>
        <p className="text-muted">
          We&apos;re getting it ready. You can follow every step under Orders.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/orders/${found.number}`}
          className={buttonStyles({ variant: "primary" })}
        >
          Track order
        </Link>
        <Link
          href="/products"
          className={buttonStyles({ variant: "secondary" })}
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
