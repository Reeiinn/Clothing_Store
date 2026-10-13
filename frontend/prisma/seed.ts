import bcrypt from "bcryptjs";
import {
  PrismaClient,
  type Gender,
  type OrderStatus,
  type PaymentMethod,
  type ShippingMethod,
  type Size,
} from "../generated/prisma";

const db = new PrismaClient();

const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
const DAY_MS = 86_400_000;

const categories = [
  { name: "Tops", slug: "tops" },
  { name: "Outerwear", slug: "outerwear" },
  { name: "Denim", slug: "denim" },
  { name: "Bottoms", slug: "bottoms" },
  { name: "Knitwear", slug: "knitwear" },
];

const colors = [
  { name: "Black", slug: "black", hex: "#111111" },
  { name: "Navy", slug: "navy", hex: "#1F2A44" },
  { name: "White", slug: "white", hex: "#F5F5F5" },
  { name: "Red", slug: "red", hex: "#C0392B" },
];

// [name, category slug, gender, price in pesos, color slugs]
const products: [string, string, Gender, number, string[]][] = [
  [
    "Everyday Crew Tee",
    "tops",
    "WOMEN",
    599,
    ["black", "navy", "white", "red"],
  ],
  ["Boxy Pocket Tee", "tops", "MEN", 649, ["black", "white", "navy"]],
  ["Linen Camp Shirt", "tops", "MEN", 1299, ["white", "navy"]],
  ["Ribbed Tank", "tops", "WOMEN", 449, ["black", "white", "red"]],
  ["Oxford Button-Down", "tops", "MEN", 1199, ["white", "navy"]],
  ["Cropped Polo", "tops", "WOMEN", 799, ["black", "red"]],
  ["Coach Jacket", "outerwear", "MEN", 2499, ["black", "navy"]],
  ["Quilted Vest", "outerwear", "WOMEN", 1999, ["black", "red"]],
  ["Straight Jeans", "denim", "MEN", 1899, ["navy", "black"]],
  ["Wide-Leg Jeans", "denim", "WOMEN", 1999, ["navy", "white"]],
  ["Pleated Trousers", "bottoms", "MEN", 1499, ["black", "navy"]],
  ["Cable Knit Sweater", "knitwear", "WOMEN", 1799, ["white", "red", "navy"]],
];

// Fixed pattern (not Math.random) so everyone gets the same stock:
// a mix of sold out, low and normal.
const STOCK_PATTERN = [
  12, 8, 0, 15, 6, 9, 3, 11, 7, 14, 2, 10, 5, 13, 1, 8, 9, 6,
];

// Spec example: Red / M in stock, Red / L sold out.
const STOCK_OVERRIDES: Record<string, number> = {
  "P001-RED-M": 6,
  "P001-RED-L": 0,
};

const address = {
  fullName: "Sam Shopper",
  phone: "09171234567",
  street: "123 Rizal Avenue",
  unit: "Unit 4B",
  city: "Quezon City",
  province: "Metro Manila",
  postalCode: "1100",
};

const STATUS_PATH: Record<OrderStatus, [OrderStatus, string][]> = {
  PROCESSING: [["PROCESSING", "Order placed"]],
  SHIPPED: [
    ["PROCESSING", "Order placed"],
    ["SHIPPED", "Handed to courier"],
  ],
  DELIVERED: [
    ["PROCESSING", "Order placed"],
    ["SHIPPED", "Handed to courier"],
    ["DELIVERED", "Delivered"],
  ],
  CANCELLED: [
    ["PROCESSING", "Order placed"],
    ["CANCELLED", "Cancelled by customer"],
  ],
};

// One order per status. items are [sku, quantity].
const sampleOrders: {
  status: OrderStatus;
  daysAgo: number;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  items: [string, number][];
}[] = [
  {
    status: "PROCESSING",
    daysAgo: 1,
    shippingMethod: "STANDARD",
    paymentMethod: "CARD",
    items: [
      ["P001-RED-M", 1],
      ["P009-NAVY-L", 1],
    ],
  },
  {
    status: "SHIPPED",
    daysAgo: 4,
    shippingMethod: "EXPRESS",
    paymentMethod: "EWALLET",
    items: [["P007-BLACK-M", 1]],
  },
  {
    status: "DELIVERED",
    daysAgo: 8,
    shippingMethod: "STANDARD",
    paymentMethod: "COD",
    items: [
      ["P002-WHITE-L", 2],
      ["P012-RED-S", 1],
    ],
  },
  {
    status: "CANCELLED",
    daysAgo: 12,
    shippingMethod: "STANDARD",
    paymentMethod: "CARD",
    items: [["P004-BLACK-S", 1]],
  },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}

function shippingFee(method: ShippingMethod, subtotalCents: number) {
  if (method === "STANDARD" && subtotalCents >= 300000) return 0;
  return method === "EXPRESS" ? 25000 : 10000;
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  if (!adminPassword || !customerPassword) {
    throw new Error(
      "Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD in .env",
    );
  }

  // Children before parents because of foreign keys
  await db.returnItem.deleteMany();
  await db.returnRequest.deleteMany();
  await db.orderStatusHistory.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.bagItem.deleteMany();
  await db.variant.deleteMany();
  await db.product.deleteMany();
  await db.color.deleteMany();
  await db.category.deleteMany();

  await db.storeSetting.upsert({
    where: { id: 1 },
    update: { lowStockThreshold: 3 },
    create: { id: 1, lowStockThreshold: 3 },
  });

  const cat = Object.fromEntries(
    await Promise.all(
      categories.map(
        async (c) => [c.slug, await db.category.create({ data: c })] as const,
      ),
    ),
  );
  const col = Object.fromEntries(
    await Promise.all(
      colors.map(
        async (c) => [c.slug, await db.color.create({ data: c })] as const,
      ),
    ),
  );

  let n = 0;
  for (const [
    index,
    [name, catSlug, gender, pesos, colorSlugs],
  ] of products.entries()) {
    const code = `P${String(index + 1).padStart(3, "0")}`;
    await db.product.create({
      data: {
        name,
        slug: slugify(name),
        gender,
        description: `${name} in a relaxed everyday fit.`,
        fabric: "100% cotton",
        priceCents: pesos * 100,
        categoryId: cat[catSlug]!.id,
        createdAt: daysAgo(index),
        variants: {
          create: colorSlugs.flatMap((cs) =>
            SIZES.map((size) => {
              const sku = `${code}-${cs.toUpperCase()}-${size}`;
              const stock = STOCK_PATTERN[n++ % STOCK_PATTERN.length]!;
              return {
                sku,
                colorId: col[cs]!.id,
                size,
                stock: STOCK_OVERRIDES[sku] ?? stock,
              };
            }),
          ),
        },
      },
    });
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const customerHash = await bcrypt.hash(customerPassword, 12);
  await db.user.upsert({
    where: { email: "admin@stylegrid.test" },
    update: { role: "ADMIN", password: adminHash },
    create: {
      email: "admin@stylegrid.test",
      name: "Admin",
      role: "ADMIN",
      password: adminHash,
    },
  });
  const customer = await db.user.upsert({
    where: { email: "customer@stylegrid.test" },
    update: { role: "CUSTOMER", password: customerHash },
    create: {
      email: "customer@stylegrid.test",
      name: "Sam Shopper",
      password: customerHash,
    },
  });

  await db.address.deleteMany({ where: { userId: customer.id } });
  await db.address.create({ data: { ...address, userId: customer.id } });

  for (const o of sampleOrders) {
    const items = await Promise.all(
      o.items.map(async ([sku, quantity]) => {
        const v = await db.variant.findUniqueOrThrow({
          where: { sku },
          include: { product: true, color: true },
        });
        return {
          variantId: v.id,
          productName: v.product.name,
          colorName: v.color.name,
          size: v.size,
          unitPriceCents: v.product.priceCents,
          quantity,
        };
      }),
    );
    const subtotalCents = items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    );
    const shippingCents = shippingFee(o.shippingMethod, subtotalCents);
    const path = STATUS_PATH[o.status];

    await db.order.create({
      data: {
        userId: customer.id,
        status: o.status,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents,
        shippingMethod: o.shippingMethod,
        paymentMethod: o.paymentMethod,
        cardLast4: o.paymentMethod === "CARD" ? "4242" : null,
        trackingNumber: path.some(([s]) => s === "SHIPPED")
          ? `PH0000${o.daysAgo}`
          : null,
        shipFullName: address.fullName,
        shipPhone: address.phone,
        shipStreet: address.street,
        shipUnit: address.unit,
        shipCity: address.city,
        shipProvince: address.province,
        shipPostalCode: address.postalCode,
        createdAt: daysAgo(o.daysAgo),
        deliveredAt:
          o.status === "DELIVERED"
            ? daysAgo(o.daysAgo - path.length + 1)
            : null,
        items: { create: items },
        history: {
          create: path.map(([status, note], i) => ({
            status,
            note,
            createdAt: daysAgo(o.daysAgo - i),
          })),
        },
      },
    });
  }

  console.log(
    `Seeded ${products.length} products, ${n} variants, ${sampleOrders.length} orders.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
