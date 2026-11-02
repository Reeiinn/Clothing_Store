import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

import { OrdersView } from "./OrdersView";

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/orders");

  return <OrdersView />;
}
