export const FIELD_ORDER = [
  "fullName",
  "phone",
  "street",
  "unit",
  "city",
  "province",
  "postalCode",
  "cardNumber",
  "nameOnCard",
  "expiry",
  "cvc",
] as const;

export type FieldName = (typeof FIELD_ORDER)[number];
export type FieldErrors = Partial<Record<FieldName, string>>;

export type Delivery = "STANDARD" | "EXPRESS";
export type PaymentMethod = "CARD" | "EWALLET" | "COD";

export type FormValues = {
  fullName: string;
  phone: string;
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
  saveAddress: boolean;
  delivery: Delivery;
  method: PaymentMethod;
  cardNumber: string;
  nameOnCard: string;
  expiry: string;
  cvc: string;
};

const EXPIRY_FORMAT = /^(0[1-9]|1[0-2])\/\d{2}$/;

function expiryIsInFuture(expiry: string) {
  const [monthText, yearText] = expiry.split("/");
  const month = Number(monthText);
  const year = 2000 + Number(yearText);
  const now = new Date();
  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1)
  );
}

/** Same rules as the server, so mistakes show up before anything is sent. */
export function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Enter the recipient's full name";
  }

  const phone = values.phone.trim();
  if (phone.length < 7 || !/^[+\d().\-\s]+$/.test(phone)) {
    errors.phone = "Enter a valid phone number";
  }

  if (!values.street.trim()) errors.street = "Enter a street address";
  if (!values.city.trim()) errors.city = "Enter a city";
  if (!values.province.trim()) errors.province = "Enter a province";
  if (!values.postalCode.trim()) errors.postalCode = "Enter a postal code";

  if (values.method === "CARD") {
    if (!/^\d{16}$/.test(values.cardNumber.replace(/\s/g, ""))) {
      errors.cardNumber = "Enter a valid 16-digit card number";
    }
    if (!values.nameOnCard.trim()) {
      errors.nameOnCard = "Enter the name on the card";
    }
    if (!EXPIRY_FORMAT.test(values.expiry)) {
      errors.expiry = "Enter an expiry in MM/YY format";
    } else if (!expiryIsInFuture(values.expiry)) {
      errors.expiry = "Card expiry must be in the future";
    }
    if (!/^\d{3}$/.test(values.cvc)) {
      errors.cvc = "Enter a 3-digit CVC";
    }
  }

  return errors;
}

export function firstInvalidField(errors: FieldErrors) {
  return FIELD_ORDER.find((name) => errors[name]);
}

/**
 * The server reports bad input as a JSON list of issues, each with a path like
 * ["address", "street"]. Returns the messages keyed by input, or null when the
 * text isn't a validation error.
 */
export function parseServerErrors(message: string): FieldErrors | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const errors: FieldErrors = {};
  for (const issue of parsed as unknown[]) {
    if (typeof issue !== "object" || issue === null) continue;
    const { path, message: text } = issue as {
      path?: unknown;
      message?: unknown;
    };
    if (!Array.isArray(path) || typeof text !== "string") continue;

    const group: unknown = path[0];
    const field: unknown = path[path.length - 1];
    if (
      (group === "address" || group === "payment") &&
      typeof field === "string" &&
      (FIELD_ORDER as readonly string[]).includes(field)
    ) {
      errors[field as FieldName] ??= text;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** "Only 1 left in Black / XL" becomes "Black / XL only has 1 left". */
export function stockConflictText(message: string) {
  const match = /^Only (\d+) left in (.+)$/.exec(message);
  const left = match?.[1];
  const label = match?.[2];
  if (!left || !label) return message;
  return left === "0"
    ? `${label} is sold out`
    : `${label} only has ${left} left`;
}

export function formatCardNumber(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length >= 3
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}
