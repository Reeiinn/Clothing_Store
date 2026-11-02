export type StockStatus = "OK" | "LOW" | "SOLD_OUT";

export function stockStatus(stock: number, threshold: number): StockStatus {
  if (stock === 0) return "SOLD_OUT";
  if (stock <= threshold) return "LOW";
  return "OK";
}

export function lineWarning(
  stock: number,
  quantity: number,
  threshold: number,
  label: string,
) {
  if (stock === 0) return "Sold out";
  if (quantity > stock) {
    return `Only ${stock} available, please lower the quantity`;
  }
  if (stock <= threshold) return `Only ${stock} left in ${label}`;
  return null;
}
