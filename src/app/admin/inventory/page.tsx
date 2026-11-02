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
  const threshold = api.inventory.getThreshold.useQuery();
  const alerts = api.inventory.alerts.useQuery(
    { filter, page, pageSize: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );
  const productId = selectedProductId ?? alerts.data?.rows[0]?.productId;
  const grid = api.inventory.variantMatrix.useQuery(
    { productId: productId ?? "" },
    { enabled: !!productId },
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Inventory</h1>
          <p className="text-muted text-sm">
            Low-stock alerts for every size and color
          </p>
        </div>
        <ThresholdControl current={threshold.data?.threshold ?? 3} />
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
          items={alerts.data?.rows ?? []}
          total={alerts.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          filter={filter}
          loading={alerts.isPending}
          activeProductId={productId}
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
          <VariantGrid grid={grid.data} loading={grid.isLoading} />
        )}
      </section>
    </div>
  );
}
