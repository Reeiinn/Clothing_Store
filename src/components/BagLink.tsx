"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

export function BagLink({ initialCount }: { initialCount: number }) {
  const { data: count } = api.bag.count.useQuery(undefined, {
    initialData: initialCount,
  });
  return (
    <Link
      href="/bag"
      aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
      className="hover:bg-ink/5 relative -m-2 flex size-10 items-center justify-center rounded-full"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 && (
        <span className="bg-ink text-paper absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] leading-none">
          {count}
        </span>
      )}
    </Link>
  );
}
