"use client";

import { useEffect } from "react";

import { api } from "~/trpc/react";

/**
 * The bag was emptied by the order, so make sure the header count and the bag
 * page don't keep showing old numbers.
 */
export function BagRefresher() {
  const utils = api.useUtils();

  useEffect(() => {
    void utils.bag.count.invalidate();
    void utils.bag.get.invalidate();
  }, [utils]);

  return null;
}
