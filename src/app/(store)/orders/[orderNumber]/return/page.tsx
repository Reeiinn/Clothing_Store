export default async function ReturnPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <h1 className="text-2xl font-semibold">Return items from {orderNumber}</h1>
  );
}
