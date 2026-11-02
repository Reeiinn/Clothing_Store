import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requestHost, storeHost } from "~/lib/hosts";
import { auth } from "~/server/auth";
import { AdminNav } from "./_components/AdminNav";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const host = requestHost(await headers());

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-placeholder border-ink flex shrink-0 flex-col gap-4 border-b px-4 py-4 md:w-56 md:gap-8 md:border-r md:border-b-0 md:py-8">
        <Link href="/inventory" className="flex flex-col px-3">
          <span className="font-semibold tracking-[0.2em]">STYLEGRID</span>
          <span className="text-muted font-mono text-xs tracking-wide">
            ADMIN
          </span>
        </Link>
        <AdminNav storeUrl={`//${storeHost(host)}/products`} />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
