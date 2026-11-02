"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cx } from "~/lib/cx";
import { formatPrice } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

import { CheckoutSummary } from "./CheckoutSummary";
import { Field } from "./Field";
import {
  firstInvalidField,
  formatCardNumber,
  formatExpiry,
  validate,
  type FieldErrors,
  type FormValues,
} from "./validation";

type Summary = RouterOutputs["checkout"]["summary"];
type SavedAddress = Summary["addresses"][number];
type DeliveryOption = Summary["deliveryOptions"][number];

const NEW_ADDRESS = "new";

function addressValues(address: SavedAddress | undefined) {
  return {
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    street: address?.street ?? "",
    unit: address?.unit ?? "",
    city: address?.city ?? "",
    province: address?.province ?? "",
    postalCode: address?.postalCode ?? "",
  };
}

function deliveryTime(option: DeliveryOption) {
  return "days" in option
    ? `${option.days} business days`
    : `${option.minDays}–${option.maxDays} business days`;
}

function SectionHeading({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <span
        aria-hidden
        className="border-ink flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[13px]"
      >
        {step}
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  aside,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-center gap-3 border-2 p-4",
        checked ? "border-ink" : "border-line hover:border-muted",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="accent-ink size-[18px] shrink-0"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
      {aside && <span className="shrink-0 text-[15px]">{aside}</span>}
    </label>
  );
}

export function CheckoutForm({ summary }: { summary: Summary }) {
  const router = useRouter();
  const utils = api.useUtils();

  // The default address comes first, so it's pre-filled
  const firstAddress = summary.addresses[0];
  const [savedId, setSavedId] = useState(firstAddress?.id ?? NEW_ADDRESS);
  const [values, setValues] = useState<FormValues>({
    ...addressValues(firstAddress),
    saveAddress: false,
    delivery: "STANDARD",
    method: "CARD",
    cardNumber: "",
    nameOnCard: "",
    expiry: "",
    cvc: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const bannerRef = useRef<HTMLDivElement>(null);
  const paymentErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (banner) bannerRef.current?.scrollIntoView({ block: "center" });
  }, [banner]);
  useEffect(() => {
    if (paymentError)
      paymentErrorRef.current?.scrollIntoView({ block: "center" });
  }, [paymentError]);

  const placeOrder = api.checkout.placeOrder.useMutation({
    onSuccess: ({ orderNumber }) => {
      // The bag is empty now, so the header count has to refresh. Not awaited:
      // a failed refresh must never look like a failed order.
      void utils.bag.count.invalidate();
      void utils.bag.get.invalidate();
      router.push(`/checkout/success?order=${orderNumber}`);
    },
    onError: (error) => {
      if (error.data?.code === "PAYMENT_REQUIRED")
        setPaymentError(error.message);
      // The form checks the same rules first, so this only happens if they drift
      else if (error.data?.zodError) setBanner("Some details are invalid.");
      else setBanner(error.message);
    },
  });

  // Stays disabled after success too, until the page changes
  const busy = placeOrder.isPending || placeOrder.isSuccess;

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      key in current ? { ...current, [key]: undefined } : current,
    );
  }

  // Editing any address field means it's no longer the saved address
  function setAddressField(
    key:
      | "fullName"
      | "phone"
      | "street"
      | "unit"
      | "city"
      | "province"
      | "postalCode",
    value: string,
  ) {
    setSavedId(NEW_ADDRESS);
    setField(key, value);
  }

  function pickAddress(id: string) {
    setSavedId(id);
    setErrors({});
    const address = summary.addresses.find((a) => a.id === id);
    setValues((current) => ({
      ...current,
      ...addressValues(address),
      saveAddress: false,
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBanner(null);
    setPaymentError(null);

    const found = validate(values);
    setErrors(found);
    const first = firstInvalidField(found);
    if (first) {
      document.getElementById(`field-${first}`)?.focus();
      return;
    }

    placeOrder.mutate({
      address: {
        fullName: values.fullName,
        phone: values.phone,
        street: values.street,
        unit: values.unit.trim() || undefined,
        city: values.city,
        province: values.province,
        postalCode: values.postalCode,
      },
      // A saved address is already saved
      saveAddress: savedId === NEW_ADDRESS && values.saveAddress,
      delivery: values.delivery,
      payment:
        values.method === "CARD"
          ? {
              method: "CARD",
              cardNumber: values.cardNumber,
              nameOnCard: values.nameOnCard,
              expiry: values.expiry,
              cvc: values.cvc,
            }
          : { method: values.method },
    });
  }

  const selectedDelivery =
    summary.deliveryOptions.find((o) => o.method === values.delivery) ??
    summary.deliveryOptions[0];

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <form
        id="checkout-form"
        noValidate
        onSubmit={submit}
        className="min-w-0 flex-1"
      >
        {/* A disabled fieldset locks every input while the order is sent */}
        <fieldset
          disabled={busy}
          className="m-0 flex min-w-0 flex-col gap-9 border-0 p-0"
        >
          {banner && (
            <div
              ref={bannerRef}
              role="alert"
              className="border-danger bg-danger-bg text-danger flex flex-wrap items-center justify-between gap-3 border p-4 text-sm"
            >
              <p className="font-medium">{banner}</p>
              <Link
                href="/bag"
                className="font-medium underline underline-offset-2"
              >
                Back to bag
              </Link>
            </div>
          )}

          <section
            aria-labelledby="shipping-heading"
            className="flex flex-col gap-4"
          >
            <div id="shipping-heading">
              <SectionHeading step={1} title="Shipping address" />
            </div>

            {summary.addresses.length > 0 && (
              <div>
                <label htmlFor="saved-address" className="mb-1.5 block text-sm">
                  Use a saved address
                </label>
                <select
                  id="saved-address"
                  value={savedId}
                  onChange={(event) => pickAddress(event.target.value)}
                  className="border-ink h-12 w-full border bg-white px-3 text-sm"
                >
                  {summary.addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.fullName} — {address.street}, {address.city}
                      {address.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                  <option value={NEW_ADDRESS}>Enter a new address</option>
                </select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="fullName"
                label="Full name"
                autoComplete="name"
                maxLength={100}
                value={values.fullName}
                error={errors.fullName}
                onValue={(v) => setAddressField("fullName", v)}
              />
              <Field
                name="phone"
                label="Mobile number"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                value={values.phone}
                error={errors.phone}
                onValue={(v) => setAddressField("phone", v)}
              />
            </div>
            <Field
              name="street"
              label="Street address"
              autoComplete="address-line1"
              maxLength={200}
              value={values.street}
              error={errors.street}
              onValue={(v) => setAddressField("street", v)}
            />
            <Field
              name="unit"
              label="Apartment, unit, building (optional)"
              autoComplete="address-line2"
              maxLength={100}
              value={values.unit}
              error={errors.unit}
              onValue={(v) => setAddressField("unit", v)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                name="city"
                label="City"
                autoComplete="address-level2"
                maxLength={100}
                value={values.city}
                error={errors.city}
                onValue={(v) => setAddressField("city", v)}
              />
              <Field
                name="province"
                label="Province / State"
                autoComplete="address-level1"
                maxLength={100}
                value={values.province}
                error={errors.province}
                onValue={(v) => setAddressField("province", v)}
              />
              <Field
                name="postalCode"
                label="Postal code"
                autoComplete="postal-code"
                maxLength={20}
                value={values.postalCode}
                error={errors.postalCode}
                onValue={(v) => setAddressField("postalCode", v)}
              />
            </div>

            {savedId === NEW_ADDRESS && (
              <label className="flex items-center gap-2.5 text-[15px]">
                <input
                  type="checkbox"
                  checked={values.saveAddress}
                  onChange={(event) =>
                    setField("saveAddress", event.target.checked)
                  }
                  className="accent-ink size-[18px]"
                />
                Save this address to my account
              </label>
            )}
          </section>

          <section
            aria-labelledby="delivery-heading"
            className="flex flex-col gap-2.5"
          >
            <div id="delivery-heading">
              <SectionHeading step={2} title="Delivery" />
            </div>
            <div
              role="radiogroup"
              aria-labelledby="delivery-heading"
              className="flex flex-col gap-2.5"
            >
              {summary.deliveryOptions.map((option) => (
                <RadioCard
                  key={option.method}
                  name="delivery"
                  value={option.method}
                  checked={values.delivery === option.method}
                  onChange={() => setField("delivery", option.method)}
                  aside={formatPrice(option.feeCents)}
                >
                  <span className="text-[15px] font-semibold">
                    {option.method === "STANDARD" ? "Standard" : "Express"}
                  </span>
                  <span className="text-muted text-sm">
                    {deliveryTime(option)}
                  </span>
                </RadioCard>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="payment-heading"
            className="flex flex-col gap-2.5"
          >
            <div id="payment-heading">
              <SectionHeading step={3} title="Payment">
                <span className="border-ink border border-dashed px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide">
                  TEST MODE · SIMULATED
                </span>
              </SectionHeading>
            </div>

            <div
              role="radiogroup"
              aria-labelledby="payment-heading"
              className="flex flex-col gap-2.5"
            >
              <RadioCard
                name="payment"
                value="CARD"
                checked={values.method === "CARD"}
                onChange={() => setField("method", "CARD")}
              >
                <span className="text-[15px]">Credit / debit card</span>
              </RadioCard>
              <RadioCard
                name="payment"
                value="EWALLET"
                checked={values.method === "EWALLET"}
                onChange={() => setField("method", "EWALLET")}
              >
                <span className="text-[15px]">E-wallet</span>
              </RadioCard>
              <RadioCard
                name="payment"
                value="COD"
                checked={values.method === "COD"}
                onChange={() => setField("method", "COD")}
              >
                <span className="text-[15px]">Cash on delivery</span>
              </RadioCard>
            </div>

            {values.method === "CARD" && (
              <div className="bg-placeholder border-line flex flex-col gap-4 border p-4">
                <Field
                  name="cardNumber"
                  label="Card number"
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={values.cardNumber}
                  error={errors.cardNumber}
                  onValue={(v) => setField("cardNumber", formatCardNumber(v))}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    name="nameOnCard"
                    label="Name on card"
                    autoComplete="cc-name"
                    maxLength={100}
                    value={values.nameOnCard}
                    error={errors.nameOnCard}
                    onValue={(v) => setField("nameOnCard", v)}
                  />
                  <Field
                    name="expiry"
                    label="Expiry (MM/YY)"
                    placeholder="MM/YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={values.expiry}
                    error={errors.expiry}
                    onValue={(v) => setField("expiry", formatExpiry(v))}
                  />
                  <Field
                    name="cvc"
                    label="CVC"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={3}
                    value={values.cvc}
                    error={errors.cvc}
                    onValue={(v) => setField("cvc", v.replace(/\D/g, ""))}
                  />
                </div>
                <p className="text-muted text-xs">
                  Test cards:{" "}
                  <span className="font-mono">4242 4242 4242 4242</span>{" "}
                  succeeds,{" "}
                  <span className="font-mono">4000 0000 0000 0002</span> is
                  declined. Use any future expiry and any 3-digit CVC.
                </p>
              </div>
            )}
            {values.method === "EWALLET" && (
              <p className="bg-placeholder text-muted p-4 text-sm">
                Simulated e-wallet payment. No money is taken in test mode.
              </p>
            )}
            {values.method === "COD" && (
              <p className="bg-placeholder text-muted p-4 text-sm">
                Pay in cash when your order arrives.
              </p>
            )}

            {paymentError && (
              <p
                ref={paymentErrorRef}
                role="alert"
                className="border-danger bg-danger-bg text-danger border p-3 text-sm font-medium"
              >
                {paymentError}. Check the card details, or try another payment
                method.
              </p>
            )}
          </section>
        </fieldset>
      </form>

      <CheckoutSummary
        items={summary.items}
        subtotalCents={summary.subtotalCents}
        shippingCents={selectedDelivery?.feeCents ?? 0}
        shippingLabel={values.delivery === "STANDARD" ? "Standard" : "Express"}
        loading={busy}
      />
    </div>
  );
}
