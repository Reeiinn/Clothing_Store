import Link from "next/link";

const links = [
  { label: "Help", href: "/help" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Size guide", href: "/size-guide" },
];

export function StoreFooter() {
  return (
    <footer className="border-line mt-24 border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 text-sm sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold tracking-[0.2em]">STYLEGRID</p>
          <p className="text-muted mt-2">© StyleGrid Retail</p>
        </div>
        <nav
          aria-label="Customer service"
          className="text-muted flex flex-wrap gap-x-8 gap-y-3"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
