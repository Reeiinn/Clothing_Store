"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Breadcrumb } from "~/components/Breadcrumb";
import { Button } from "~/components/Button";
import { ColorSwatch } from "~/components/ColorSwatch";
import { ProductCard } from "~/components/ProductCard";
import { SizeChip } from "~/components/SizeChip";
import { SIZES, type SizeCode } from "~/lib/constants";
import { cx } from "~/lib/cx";
import { api, type RouterOutputs } from "~/trpc/react";

const PAGE_SIZE = 8;

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

const genderLabel = { men: "Men's", women: "Women's" } as const;

const tags = {
  OK: undefined,
  LOW: "LOW STOCK",
  SOLD_OUT: "SOLD OUT",
} as const;

type Filters = ReturnType<typeof parseFilters>;
type Update = (changes: Record<string, string | undefined>) => void;

function isSize(value: string | null): value is SizeCode {
  return SIZES.some((s) => s === value);
}

function parseFilters(params: URLSearchParams) {
  const list = (key: string) =>
    params.get(key)?.split(",").filter(Boolean) ?? [];
  const gender = (["men", "women"] as const).find(
    (g) => g === params.get("gender"),
  );
  const inStockSize = params.get("inStockSize");
  const page = Number(params.get("page"));
  return {
    category: params.get("category") ?? undefined,
    gender,
    sizes: list("sizes").filter(isSize),
    colors: list("colors"),
    inStockSize: isSize(inStockSize) ? inStockSize : undefined,
    q: params.get("q") ?? undefined,
    sort:
      sortOptions.find((o) => o.value === params.get("sort"))?.value ??
      "newest",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

function toggle(list: string[], value: string) {
  const next = list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
  return next.length ? next.join(",") : undefined;
}

export function Catalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  const [panelOpen, setPanelOpen] = useState(false);

  const update: Update = (changes) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString().replaceAll("%2C", ",");
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearAll = () =>
    router.push(
      filters.sort === "newest" ? pathname : `${pathname}?sort=${filters.sort}`,
      { scroll: false },
    );

  const { page, ...query } = filters;
  const facets = api.product.facets.useQuery({ gender: filters.gender });
  const pages = api.useQueries((t) =>
    Array.from({ length: page }, (_, i) =>
      t.product.list({ ...query, page: i + 1, pageSize: PAGE_SIZE }),
    ),
  );

  const items = [];
  for (const p of pages) {
    if (!p.data) break;
    items.push(...p.data.items);
  }
  const total = pages[0]?.data?.total;
  const loading = pages.some((p) => p.isPending);
  const failed = pages.some((p) => p.isError);

  const categoryName = facets.data?.categories.find(
    (c) => c.slug === filters.category,
  )?.name;
  const heading = filters.category ? (categoryName ?? "") : "All clothing";

  const crumbs: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
  ];
  if (filters.gender) {
    crumbs.push({
      label: genderLabel[filters.gender],
      href: `/products?gender=${filters.gender}`,
    });
  }
  crumbs.push({ label: heading });

  const chips: { label: string; clear: Record<string, undefined | string> }[] =
    [];
  if (filters.category) {
    chips.push({ label: heading, clear: { category: undefined } });
  }
  for (const size of filters.sizes) {
    chips.push({
      label: `Size ${size}`,
      clear: { sizes: toggle(filters.sizes, size) },
    });
  }
  for (const color of filters.colors) {
    chips.push({
      label: color,
      clear: { colors: toggle(filters.colors, color) },
    });
  }
  if (filters.inStockSize) {
    chips.push({
      label: `In stock in ${filters.inStockSize}`,
      clear: { inStockSize: undefined },
    });
  }
  if (filters.q) {
    chips.push({ label: `"${filters.q}"`, clear: { q: undefined } });
  }
  const hasFilters = chips.length > 0 || !!filters.gender;

  const filterPanel = (
    <FilterPanel filters={filters} facets={facets.data} update={update} />
  );

  return (
    <div>
      <Breadcrumb items={crumbs} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="min-h-10 text-4xl font-semibold">{heading}</h1>
          <p className="text-muted mt-1 min-h-5 text-sm">
            {total !== undefined &&
              `${total} ${total === 1 ? "item" : "items"}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex" role="group" aria-label="Shop by">
            {(["men", "women"] as const).map((g) => {
              const active = filters.gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ gender: active ? undefined : g })}
                  className={cx(
                    "border-ink h-11 border px-5 text-sm transition-colors not-first:-ml-px",
                    active ? "bg-ink text-paper" : "hover:bg-ink/5",
                  )}
                >
                  {genderLabel[g]}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-3 text-sm">
            Sort by
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="border-ink h-11 border bg-transparent px-3 text-sm"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8 flex gap-10">
        <aside aria-label="Filters" className="hidden w-64 shrink-0 lg:block">
          {filterPanel}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen(true)}
            >
              Filters{chips.length > 0 && ` (${chips.length})`}
            </Button>
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => update(chip.clear)}
                aria-label={`Remove filter ${chip.label}`}
                className="border-ink hover:bg-ink/5 flex h-8 items-center gap-2 rounded-full border px-3 text-sm"
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm underline underline-offset-4"
              >
                Clear all
              </button>
            )}
          </div>

          {failed ? (
            <p className="text-danger py-16 text-center text-sm">
              Couldn&apos;t load products. Please refresh the page.
            </p>
          ) : total === 0 ? (
            <div className="border-line border py-16 text-center">
              <p className="text-lg">No items match these filters</p>
              <Button variant="secondary" className="mt-5" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-5">
                {items.map((item) => (
                  <li key={item.id}>
                    <ProductCard
                      slug={item.slug}
                      name={item.name}
                      priceCents={item.priceCents}
                      imageUrl={item.imageUrl}
                      colors={item.colors}
                      sizes={
                        !item.sizeRange
                          ? []
                          : item.sizeRange.min === item.sizeRange.max
                            ? [item.sizeRange.min]
                            : [item.sizeRange.min, item.sizeRange.max]
                      }
                      tag={tags[item.stockFlag]}
                    />
                  </li>
                ))}
                {loading &&
                  Array.from({ length: PAGE_SIZE }, (_, i) => (
                    <CardSkeleton key={i} />
                  ))}
              </ul>

              {total !== undefined && !loading && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <p className="text-muted text-sm">
                    Showing {items.length} of {total}
                  </p>
                  {items.length < total && (
                    <Button
                      variant="secondary"
                      onClick={() => update({ page: String(page + 1) })}
                    >
                      Load more
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {panelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className="bg-paper fixed inset-0 z-30 flex flex-col lg:hidden"
        >
          <div className="border-line flex h-16 shrink-0 items-center justify-between border-b px-4">
            <h2 className="font-semibold">Filters</h2>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="font-mono text-xs tracking-wide"
            >
              CLOSE
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">{filterPanel}</div>
          <div className="border-line flex shrink-0 gap-3 border-t p-4">
            <Button variant="secondary" className="flex-1" onClick={clearAll}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setPanelOpen(false)}>
              Show {total ?? ""} items
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  filters,
  facets,
  update,
}: {
  filters: Filters;
  facets: RouterOutputs["product"]["facets"] | undefined;
  update: Update;
}) {
  const [mySize, setMySize] = useState<SizeCode>(filters.inStockSize ?? "M");
  const availabilitySize = filters.inStockSize ?? mySize;

  return (
    <div className="flex flex-col gap-9">
      <FilterGroup title="Category">
        <ul className="flex flex-col gap-4">
          {facets?.categories.map((c) => {
            const active = filters.category === c.slug;
            return (
              <li key={c.slug}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      update({ category: active ? undefined : c.slug })
                    }
                    className="accent-ink size-4"
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-muted font-mono text-xs">
                    {c.count}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-1">
          {SIZES.map((size) => (
            <SizeChip
              key={size}
              size={size}
              selected={filters.sizes.includes(size)}
              onClick={() => update({ sizes: toggle(filters.sizes, size) })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <ul className="flex flex-col gap-3">
          {facets?.colors.map((color) => (
            <li key={color.name} className="flex items-center gap-3 text-sm">
              <ColorSwatch
                name={color.name}
                hex={color.hex}
                selected={filters.colors.includes(color.name)}
                onClick={() =>
                  update({ colors: toggle(filters.colors, color.name) })
                }
              />
              {color.name}
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Availability">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!filters.inStockSize}
            onChange={(e) =>
              update({
                inStockSize: e.target.checked ? availabilitySize : undefined,
              })
            }
            className="accent-ink size-4"
          />
          In stock in my size only
        </label>
        <label className="mt-3 ml-7 flex items-center gap-2 text-sm">
          Size
          <select
            value={availabilitySize}
            onChange={(e) => {
              if (!isSize(e.target.value)) return;
              setMySize(e.target.value);
              if (filters.inStockSize) update({ inStockSize: e.target.value });
            }}
            className="border-line h-8 border bg-transparent px-2 font-mono text-sm"
          >
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-xs tracking-widest uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CardSkeleton() {
  return (
    <li aria-hidden className="animate-pulse">
      <div className="bg-placeholder aspect-[3/4] w-full" />
      <div className="bg-placeholder mt-3 h-4 w-2/3" />
      <div className="bg-placeholder mt-2 h-3 w-1/3" />
    </li>
  );
}
