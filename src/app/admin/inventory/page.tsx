"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "~/trpc/react";
import { StatusTabs } from "../_components/StatusTabs";
import { AlertsTable } from "./AlertsTable";
import { StatCards } from "./StatCards";
import { ThresholdControl } from "./ThresholdControl";
import { VariantGrid } from "./VariantGrid";

type Filter = "ALL" | "SOLD_OUT" | "LOW";

const tabs: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All alerts" },
  { value: "SOLD_OUT", label: "Sold out" },
  { value: "LOW", label: "Low stock" },
];

const PAGE_SIZE = 20;

export default function AdminInventoryPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string>();

  const stats = api.inventory.stats.useQuery();
  const alerts = api.inventory.alerts.useQuery(
    { filter, page, pageSize: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );
  // With no product picked, the server defaults to the first alert's product.
  const grid = api.inventory.variantGrid.useQuery({
    productId: selectedProductId,
  });

  // After a restock the last row of a page can disappear; step back a page.
  useEffect(() => {
    if (
      alerts.data &&
      !alerts.isPlaceholderData &&
      alerts.data.items.length === 0 &&
      page > 1
    ) {
      setPage((current) => current - 1);
    }
  }, [alerts.data, alerts.isPlaceholderData, page]);

  function changeFilter(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Inventory</h1>
          <p className="text-muted text-sm">
            Low-stock alerts for every size and color
          </p>
        </div>
        <ThresholdControl current={stats.data?.threshold ?? 3} />
      </div>

      {stats.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load the stats: {stats.error.message}
        </p>
      )}
      <StatCards stats={stats.data} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Stock alerts</h2>
          <StatusTabs
            label="Filter stock alerts"
            tabs={tabs}
            value={filter}
            onChange={changeFilter}
          />
        </div>

        {alerts.isError && (
          <p role="alert" className="text-danger text-sm">
            Couldn&apos;t load the alerts: {alerts.error.message}
          </p>
        )}
        <AlertsTable
          items={alerts.data?.items ?? []}
          total={alerts.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          filter={filter}
          loading={alerts.isPending}
          activeProductId={grid.data?.productId}
          onSelectProduct={setSelectedProductId}
          onPageChange={setPage}
        />
      </section>

      <section>
        {grid.isError ? (
          <p role="alert" className="text-danger text-sm">
            Couldn&apos;t load the stock grid: {grid.error.message}
          </p>
        ) : (
          <VariantGrid grid={grid.data} loading={grid.isPending} />
        )}
      </section>
    </div>
  );
}
