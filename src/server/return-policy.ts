export const RETURN_WINDOW_DAYS = 30;

export function getReturnWindowEndsAt(deliveredAt: Date | null) {
  return deliveredAt
    ? new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    : null;
}

export function isWithinReturnWindow(
  deliveredAt: Date | null,
  now = new Date(),
) {
  const end = getReturnWindowEndsAt(deliveredAt);
  return end !== null && now <= end;
}