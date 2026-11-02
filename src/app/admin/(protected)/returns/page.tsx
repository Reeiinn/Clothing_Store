"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "~/components/Button";
import { StatusBadge } from "~/components/StatusBadge";
import { formatPrice } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";
import { errorMessage } from "../_components/error-message";
import { Pager } from "../_components/Pager";
import { StatusTabs } from "../_components/StatusTabs";

type ReturnRequest = RouterOutputs["returns"]["adminList"]["requests"][number];
type Tab = ReturnRequest["status"];

const tabs: { value: Tab; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "RECEIVED", label: "Received" },
  { value: "REJECTED", label: "Rejected" },
];

const reasonLabels: Record<string, string> = {
  SIZE_DIDNT_FIT: "Size didn't fit",
  NOT_AS_PICTURED: "Not as pictured",
  DAMAGED: "Damaged",
  WRONG_ITEM: "Wrong item",
  CHANGED_MIND: "Changed mind",
  OTHER: "Other",
};

const th = "px-4 py-2 text-left font-mono text-xs font-medium tracking-wide";
const td = "px-4 py-2 text-sm";

function ReturnActions({ request }: { request: ReturnRequest }) {
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);

  const update = api.returns.updateStatus.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.returns.adminList.invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (request.status === "RECEIVED" || request.status === "REJECTED") {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {request.status === "REQUESTED" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            loading={update.isPending}
            onClick={() =>
              update.mutate({ id: request.id, status: "APPROVED" })
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={update.isPending}
            onClick={() =>
              update.mutate({ id: request.id, status: "REJECTED" })
            }
          >
            Reject
          </Button>
        </div>
      )}

      {request.status === "APPROVED" && (
        <>
          <Button
            size="sm"
            loading={update.isPending}
            onClick={() =>
              update.mutate({ id: request.id, status: "RECEIVED" })
            }
          >
            Mark as received
          </Button>
          <p className="text-muted text-xs">Adds the items back to stock</p>
        </>
      )}

      {error && (
        <p role="alert" className="text-danger max-w-64 text-right text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AdminReturnsPage() {
  const [tab, setTab] = useState<Tab>("REQUESTED");
  const [page, setPage] = useState(1);
  const returns = api.returns.adminList.useQuery({ status: tab, page });

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold">Return requests</h1>
          <p className="text-muted text-sm">
            Approve a return, then mark it received when the items arrive
          </p>
        </div>
        <StatusTabs
          label="Filter returns by status"
          tabs={tabs}
          value={tab}
          onChange={changeTab}
        />
      </div>

      {returns.isError && (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load return requests: {returns.error.message}
        </p>
      )}
      {returns.isPending && (
        <p className="text-muted text-sm">Loading return requests…</p>
      )}
      {returns.data?.requests.length === 0 && (
        <p className="border-ink text-muted border p-6 text-sm">
          No {tab.toLowerCase()} return requests.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {returns.data?.requests.map((request) => (
          <article key={request.id} className="border-ink border">
            <header className="border-ink bg-placeholder flex flex-wrap items-start justify-between gap-4 border-b p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/orders/${request.order.number}`}
                    className="font-mono font-medium underline"
                  >
                    Order #{request.order.number}
                  </Link>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-sm">
                  {request.user.name ?? "Unnamed customer"}{" "}
                  <span className="text-muted">({request.user.email})</span>
                </p>
                <p className="text-muted text-xs">
                  Requested{" "}
                  {request.createdAt.toLocaleDateString("en-PH", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted text-xs">Estimated refund</p>
                <p className="font-mono text-xl font-semibold">
                  {formatPrice(
                    request.items.reduce(
                      (sum, item) =>
                        sum + item.orderItem.unitPriceCents * item.quantity,
                      0,
                    ),
                  )}
                </p>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse">
                <thead className="border-line border-b">
                  <tr>
                    <th className={th}>ITEM</th>
                    <th className={th}>COLOR / SIZE</th>
                    <th className={`${th} text-right`}>QTY</th>
                    <th className={th}>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-line border-b last:border-b-0"
                    >
                      <td className={`${td} font-medium`}>
                        {item.orderItem.productName}
                      </td>
                      <td className={td}>
                        {item.orderItem.colorName} /{" "}
                        <span className="font-mono">{item.orderItem.size}</span>
                      </td>
                      <td className={`${td} text-right font-mono`}>
                        {item.quantity}
                      </td>
                      <td className={td}>
                        {reasonLabels[item.reason] ?? item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="border-line flex flex-wrap items-start justify-between gap-4 border-t p-4">
              <p className="max-w-xl text-sm">
                <span className="text-muted">Customer note: </span>
                {request.note ?? <span className="text-muted">None</span>}
              </p>
              <ReturnActions request={request} />
            </footer>
          </article>
        ))}
      </div>

      {returns.data && (
        <Pager
          page={page}
          pageSize={returns.data.pageSize}
          total={returns.data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
