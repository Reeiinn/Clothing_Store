"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

// Client side so invalidating bag.count updates it without a reload
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
