"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "~/lib/cx";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Inventory", href: "/inventory" },
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/orders" },
  { label: "Return requests", href: "/returns" },
];

const item =
  "rounded-ui flex min-h-11 items-center px-3 text-sm whitespace-nowrap";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
    >
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              item,
              active ? "bg-ink text-paper font-medium" : "hover:bg-ink/5",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={async () => {
          await signOut({ redirect: false });
          window.location.assign("/login");
        }}
        className={cx(item, "hover:bg-ink/5 text-left md:mt-4")}
      >
        Sign out
      </button>
    </nav>
  );
}
