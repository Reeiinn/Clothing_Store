export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <h1 className="text-2xl font-semibold">Order {orderNumber}</h1>;
}
