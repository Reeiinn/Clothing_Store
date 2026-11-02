"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

export function BagLink({ initialCount }: { initialCount: number }) {
  const { data: count } = api.bag.count.useQuery(undefined, {
    initialData: initialCount,
  });
  return (
    <Link href="/bag" className="hover:underline">
      Bag ({count})
    </Link>
  );
}
