import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/checkout");

  const summary = await api.checkout.summary();
  if (summary.items.length === 0) redirect("/bag");

  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-3xl font-semibold sm:text-4xl">Checkout</h1>
      <CheckoutForm summary={summary} />
    </div>
  );
}
