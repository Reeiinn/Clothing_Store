"use client";

import { useState } from "react";

import { Breadcrumb } from "~/components/Breadcrumb";
import { Button } from "~/components/Button";
import { ColorSwatch } from "~/components/ColorSwatch";
import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { ProductCard } from "~/components/ProductCard";
import { QuantityStepper } from "~/components/QuantityStepper";
import { SizeChip } from "~/components/SizeChip";
import { StatusBadge } from "~/components/StatusBadge";
import { formatPrice } from "~/lib/format";

const colors = [
  { name: "Black", hex: "#111111" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "White", hex: "#F5F5F5" },
  { name: "Red", hex: "#C0392B" },
];
const sizes = ["XS", "S", "M", "L", "XL"];
const soldOutSizes = ["XL"];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line border-t py-8">
      <h2 className="text-muted mb-4 font-mono text-xs tracking-wide">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

export default function ComponentsPage() {
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("Black");
  const [qty, setQty] = useState(1);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold">Components</h1>

      <Section title="BUTTON">
        <Button>Add to bag</Button>
        <Button variant="secondary">Save</Button>
        <Button size="sm">Small</Button>
        <Button size="sm" variant="secondary">
          Small
        </Button>
        <Button disabled>Disabled</Button>
        <Button loading>Placing order</Button>
      </Section>

      <Section title="IMAGE PLACEHOLDER">
        <ImagePlaceholder className="h-40 w-32" label="Product image" />
      </Section>

      <Section title="PRODUCT CARD">
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
          <ProductCard
            slug="oxford-shirt"
            name="Oxford Shirt"
            priceCents={129900}
            colors={colors}
            sizes={sizes}
          />
          <ProductCard
            slug="linen-trousers"
            name="Linen Trousers"
            priceCents={189900}
            colors={colors.slice(0, 2)}
            sizes={sizes}
            tag="LOW STOCK"
          />
          <ProductCard
            slug="wool-coat"
            name="Wool Coat"
            priceCents={499900}
            colors={colors.slice(0, 1)}
            sizes={["S", "M", "L"]}
            tag="SOLD OUT"
          />
        </div>
      </Section>

      <Section title="SIZE CHIP">
        {sizes.map((s) => (
          <SizeChip
            key={s}
            size={s}
            selected={s === size}
            soldOut={soldOutSizes.includes(s)}
            onClick={() => setSize(s)}
          />
        ))}
      </Section>

      <Section title="COLOR SWATCH">
        {colors.map((c) => (
          <ColorSwatch
            key={c.name}
            name={c.name}
            hex={c.hex}
            selected={c.name === color}
            onClick={() => setColor(c.name)}
          />
        ))}
        <span className="text-sm">{color}</span>
      </Section>

      <Section title="QUANTITY STEPPER (MAX 3)">
        <QuantityStepper value={qty} onChange={setQty} min={1} max={3} />
      </Section>

      <Section title="STATUS BADGE">
        <StatusBadge status="PROCESSING" />
        <StatusBadge status="SHIPPED" />
        <StatusBadge status="DELIVERED" />
        <StatusBadge status="CANCELLED" />
        <StatusBadge status="OK" />
        <StatusBadge status="LOW" />
        <StatusBadge status="SOLD_OUT" />
      </Section>

      <Section title="BREADCRUMB">
        <Breadcrumb
          items={[
            { label: "Home", href: "/products" },
            { label: "Women's", href: "/products?gender=women" },
            { label: "Tops" },
          ]}
        />
      </Section>

      <Section title="FORMAT PRICE">
        <span className="font-mono text-sm">{formatPrice(129900)}</span>
      </Section>
    </div>
  );
}
