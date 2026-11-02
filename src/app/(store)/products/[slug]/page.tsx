import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

import { ProductView } from "./ProductView";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    api.product.bySlug({ slug }).catch((error: unknown) => {
      if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
      throw error;
    }),
    auth(),
  ]);

  return (
    <ProductView key={product.id} product={product} signedIn={!!session} />
  );
}
