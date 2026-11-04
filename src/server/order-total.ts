export function withTotal<
  T extends {
    shippingCents: number;
    items: { unitPriceCents: number; quantity: number }[];
  },
>(order: T) {
  const subtotalCents = order.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  return {
    ...order,
    subtotalCents,
    totalCents: subtotalCents + order.shippingCents,
  };
}
