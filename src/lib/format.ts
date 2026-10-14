const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPrice(cents: number) {
  return peso.format(cents / 100);
}
