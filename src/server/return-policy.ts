import type { OrderStatus, Prisma } from "../../generated/prisma";

export const RETURN_WINDOW_DAYS = 30;

// Rejected returns don't count against what can still be returned
export const activeReturnItems = {
  where: { returnRequest: { status: { not: "REJECTED" } } },
  select: { quantity: true },
} satisfies Prisma.OrderItem$returnItemsArgs;

export const deliveredEntry = {
  where: { status: "DELIVERED" },
  select: { status: true, createdAt: true },
} satisfies Prisma.Order$historyArgs;

export function reachedAt(
  history: { status: OrderStatus; createdAt: Date }[],
  status: OrderStatus,
) {
  return history.find((entry) => entry.status === status)?.createdAt ?? null;
}

export function getReturnWindowEndsAt(deliveredAt: Date | null) {
  return deliveredAt
    ? new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    : null;
}

export function returnedQty(item: { returnItems: { quantity: number }[] }) {
  return item.returnItems.reduce((sum, returned) => sum + returned.quantity, 0);
}

export function returnBlockReason(order: {
  status: OrderStatus;
  deliveredAt: Date | null;
}) {
  if (order.status !== "DELIVERED") {
    return "Only delivered orders can be returned.";
  }
  const end = getReturnWindowEndsAt(order.deliveredAt);
  if (!end || new Date() > end) {
    return `The ${RETURN_WINDOW_DAYS}-day return window has expired.`;
  }
  return null;
}

export function canRequestReturn(order: {
  status: OrderStatus;
  deliveredAt: Date | null;
  items: { quantity: number; returnItems: { quantity: number }[] }[];
}) {
  return (
    !returnBlockReason(order) &&
    order.items.some((item) => item.quantity > returnedQty(item))
  );
}
