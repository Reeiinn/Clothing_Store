const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPrice(cents: number) {
  return peso.format(cents / 100);
}

// A fixed time zone keeps server-rendered and browser-rendered dates the same
const date = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

const dateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function formatDate(value: Date) {
  return date.format(value);
}

export function formatDateTime(value: Date) {
  return dateTime.format(value);
}
