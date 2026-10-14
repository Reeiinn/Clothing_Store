import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/admin/inventory");
  if (session.user.role !== "ADMIN") redirect("/products");

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link
            href="/admin/inventory"
            className="font-semibold tracking-[0.2em]"
          >
            STYLEGRID{" "}
            <span className="font-mono text-xs tracking-wide opacity-70">
              ADMIN
            </span>
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/admin/inventory" className="hover:underline">
              Inventory
            </Link>
          </nav>
          <Link href="/products" className="ml-auto text-sm hover:underline">
            View store
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
