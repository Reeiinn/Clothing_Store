import Link from "next/link";

const links = [
  { label: "Help", href: "/help" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Size guide", href: "/size-guide" },
];

export function StoreFooter() {
  return (
    <footer className="border-line mt-16 border-t">
      <div className="text-muted mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav
          aria-label="Customer service"
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <p>© StyleGrid Retail</p>
      </div>
    </footer>
  );
}
