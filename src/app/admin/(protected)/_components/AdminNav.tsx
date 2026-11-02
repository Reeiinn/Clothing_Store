"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "~/lib/cx";

const links: { label: string; href?: string }[] = [
  { label: "Dashboard" },
  { label: "Inventory", href: "/inventory" },
  { label: "Products" },
  { label: "Orders", href: "/orders" },
  { label: "Return requests", href: "/returns" },
];

const item = "flex min-h-11 items-center px-3 text-sm whitespace-nowrap";

export function AdminNav({ storeUrl }: { storeUrl: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
    >
      {links.map((link) => {
        if (!link.href) {
          return (
            <span
              key={link.label}
              aria-disabled
              title="Coming soon"
              className={cx(item, "text-muted gap-2")}
            >
              {link.label}
              <span className="font-mono text-[10px] tracking-wide">SOON</span>
            </span>
          );
        }
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              item,
              active ? "bg-ink text-paper font-semibold" : "hover:bg-ink/5",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href={storeUrl}
        className={cx(item, "underline underline-offset-2 md:mt-4")}
      >
        View store
      </a>
    </nav>
  );
}
