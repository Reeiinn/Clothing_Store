export const deliveryOptions = [
  { method: "STANDARD", feeCents: 5000, minDays: 3, maxDays: 5 },
  { method: "EXPRESS", feeCents: 15000, minDays: 2, maxDays: 2 },
] as const;

export function deliveryOption(method: "STANDARD" | "EXPRESS") {
  return method === "STANDARD" ? deliveryOptions[0] : deliveryOptions[1];
}
