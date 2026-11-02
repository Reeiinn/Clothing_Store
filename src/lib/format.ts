const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPrice(cents: number) {
  return peso.format(cents / 100);
}

// Fixed time zone so the server and browser render the same date
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
