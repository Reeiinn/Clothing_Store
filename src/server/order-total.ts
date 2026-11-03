export function withTotal<
  T extends { subtotalCents: number; shippingCents: number },
>(order: T) {
  return { ...order, totalCents: order.subtotalCents + order.shippingCents };
}
