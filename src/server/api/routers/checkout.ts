import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { bagTotals, getBagLines } from "~/server/bag";
import { deliveryOption, deliveryOptions } from "~/server/shipping";

const addressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter the recipient's full name")
    .max(100),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(30)
    .regex(/^[+\d().\-\s]+$/, "Enter a valid phone number"),
  street: z.string().trim().min(1, "Enter a street address").max(200),
  unit: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1, "Enter a city").max(100),
  province: z.string().trim().min(1, "Enter a province").max(100),
  postalCode: z.string().trim().min(1, "Enter a postal code").max(20),
});

const cardPaymentSchema = z.object({
  method: z.literal("CARD"),
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine(
      (value) => /^\d{16}$/.test(value),
      "Enter a valid 16-digit card number",
    ),
  nameOnCard: z.string().trim().min(1, "Enter the name on the card").max(100),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Enter an expiry in MM/YY format")
    .refine((value) => {
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) return false;

      const [monthText, yearText] = value.split("/");
      const month = Number(monthText);
      const year = 2000 + Number(yearText);
      const now = new Date();

      return (
        year > now.getFullYear() ||
        (year === now.getFullYear() && month >= now.getMonth() + 1)
      );
    }, "Card expiry must be in the future"),
  cvc: z.string().regex(/^\d{3}$/, "Enter a 3-digit CVC"),
});

const paymentSchema = z.discriminatedUnion("method", [
  cardPaymentSchema,
  z.object({ method: z.literal("EWALLET") }),
  z.object({ method: z.literal("COD") }),
]);

const placeOrderSchema = z.object({
  address: addressSchema,
  saveAddress: z.boolean(),
  delivery: z.enum(["STANDARD", "EXPRESS"]),
  payment: paymentSchema,
});

function confirmSimulatedPayment(payment: z.infer<typeof paymentSchema>) {
  if (payment.method !== "CARD") return;

  if (payment.cardNumber === "4000000000000002") {
    throw new TRPCError({
      code: "PAYMENT_REQUIRED",
      message: "Your card was declined",
    });
  }

  if (payment.cardNumber !== "4242424242424242") {
    throw new TRPCError({
      code: "PAYMENT_REQUIRED",
      message: "Use a test card number",
    });
  }
}

export const checkoutRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [items, addresses] = await Promise.all([
      getBagLines(ctx.db, { userId, savedForLater: false }),
      ctx.db.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { id: "asc" }],
      }),
    ]);

    return { items, ...bagTotals(items), deliveryOptions, addresses };
  }),

  placeOrder: protectedProcedure
    .input(placeOrderSchema)
    .mutation(async ({ ctx, input }) => {
      confirmSimulatedPayment(input.payment);

      const userId = ctx.session.user.id;
      const shippingCents = deliveryOption(input.delivery).feeCents;

      const cardLast4 =
        input.payment.method === "CARD"
          ? input.payment.cardNumber.slice(-4)
          : null;

      const order = await ctx.db.$transaction(async (tx) => {
        const items = await tx.bagItem.findMany({
          where: { userId, savedForLater: false },
          orderBy: { variantId: "asc" },
          select: {
            id: true,
            variantId: true,
            quantity: true,
            variant: {
              select: {
                size: true,
                stock: true,
                color: { select: { name: true } },
                product: {
                  select: { name: true, priceCents: true, hidden: true },
                },
              },
            },
          },
        });

        if (items.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your bag is empty",
          });
        }

        const unavailable = items.find((item) => item.variant.product.hidden);
        if (unavailable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${unavailable.variant.product.name} is no longer available, please remove it from your bag`,
          });
        }

        for (const item of items) {
          const result = await tx.variant.updateMany({
            where: {
              id: item.variantId,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });

          if (result.count === 0) {
            const currentVariant = await tx.variant.findUnique({
              where: { id: item.variantId },
              select: { stock: true },
            });
            const stock = currentVariant?.stock ?? 0;

            throw new TRPCError({
              code: "CONFLICT",
              message: `Only ${stock} left in ${item.variant.color.name} / ${item.variant.size}`,
            });
          }
        }

        const createdOrder = await tx.order.create({
          data: {
            userId,
            status: "PROCESSING",
            shippingCents,
            shippingMethod: input.delivery,
            paymentMethod: input.payment.method,
            cardLast4,
            shippingAddress: {
              create: {
                fullName: input.address.fullName,
                phone: input.address.phone,
                street: input.address.street,
                unit: input.address.unit ?? null,
                city: input.address.city,
                province: input.address.province,
                postalCode: input.address.postalCode,
              },
            },
            items: {
              create: items.map((item) => ({
                variantId: item.variantId,
                productName: item.variant.product.name,
                colorName: item.variant.color.name,
                unitPriceCents: item.variant.product.priceCents,
                quantity: item.quantity,
              })),
            },
            history: {
              create: [
                { status: "PROCESSING", note: "Order placed" },
                {
                  status: "PROCESSING",
                  note: "Processing — payment confirmed, items being packed",
                },
              ],
            },
          },
          select: { number: true },
        });

        await tx.bagItem.deleteMany({
          where: {
            userId,
            id: { in: items.map((item) => item.id) },
          },
        });

        if (input.saveAddress) {
          await tx.address.create({
            data: {
              userId,
              ...input.address,
              unit: input.address.unit ?? null,
            },
          });
        }

        return createdOrder;
      });

      return { orderNumber: order.number };
    }),
});
