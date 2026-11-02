import { TRPCError } from "@trpc/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

import { OrderTracking } from "../OrderTracking";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber: param } = await params;

  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/orders/${param}`)}`);
  }

  const orderNumber = Number(param);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) notFound();

  // byNumber only finds the signed-in user's orders, so anyone else's is a 404
  const order = await api.order
    .byNumber({ orderNumber })
    .catch((error: unknown) => {
      if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
      throw error;
    });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Link href="/orders" className="text-sm underline">
          ← All orders
        </Link>
        <h1 className="text-3xl font-semibold sm:text-4xl">My orders</h1>
      </div>
      <OrderTracking orderNumber={orderNumber} initialData={order} />
    </div>
  );
}
