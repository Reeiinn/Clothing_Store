"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "~/trpc/react";
import { StatusTabs } from "../_components/StatusTabs";
import { AlertsTable } from "./AlertsTable";
import { ThresholdControl } from "./ThresholdControl";

type Filter = "ALL" | "SOLD_OUT" | "LOW";

const PAGE_SIZE = 20;

export default function AdminInventoryPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);

  const stats = api.inventory.stats.useQuery();
  const threshold = api.inventory.getThreshold.useQuery();
  const alerts = api.inventory.alerts.useQuery(
    { filter, page, pageSize: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );

  useEffect(() => {
    if (
      alerts.data &&
      !alerts.isPlaceholderData &&
      alerts.data.rows.length === 0 &&
      page > 1
    ) {
      setPage((current) => current - 1);
    }
  }, [alerts.data, alerts.isPlaceholderData, page]);

  function changeFilter(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  const soldOut = stats.data?.soldOutCount;
  const low = stats.data?.lowStockCount;
  const all =
    soldOut === undefined || low === undefined ? undefined : soldOut + low;
  const count = (n: number | undefined) => (n === undefined ? "" : ` (${n})`);
  const tabs: { value: Filter; label: string }[] = [
    { value: "ALL", label: `All${count(all)}` },
    { value: "SOLD_OUT", label: `Sold out${count(soldOut)}` },
    { value: "LOW", label: `Running low${count(low)}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="text-muted text-sm">
          Sizes and colors that are sold out or running low. When new items
          arrive, click <span className="text-ink font-medium">Add stock</span>{" "}
          on that row.
        </p>
      </div>

      <StatusTabs
        label="Filter by stock level"
        tabs={tabs}
        value={filter}
        onChange={changeFilter}
      />

      {alerts.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load the list: {alerts.error.message}
        </p>
      )}
      <AlertsTable
        items={alerts.data?.rows ?? []}
        total={alerts.data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        filter={filter}
        loading={alerts.isPending}
        onPageChange={setPage}
      />

      <ThresholdControl current={threshold.data?.threshold ?? 3} />
    </div>
  );
}
