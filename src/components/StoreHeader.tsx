import Form from "next/form";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { AuthLinks } from "~/components/AuthLinks";
import { BagLink } from "~/components/BagLink";
import { MobileMenu } from "~/components/MobileMenu";
import { SignOutButton } from "~/components/SignOutButton";
import { adminHost, requestHost } from "~/lib/hosts";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

const shopLinks = [
  { label: "Men's", href: "/products?gender=men" },
  { label: "Women's", href: "/products?gender=women" },
  { label: "New in", href: "/products?sort=newest" },
];

function SearchBox({ className }: { className?: string }) {
  return (
    <Form action="/products" role="search" className={className}>
      <input
        type="search"
        name="q"
        placeholder="Search clothing"
        aria-label="Search clothing"
        className="border-line placeholder:text-muted focus:border-ink h-9 w-full border bg-transparent px-3 text-sm outline-none"
      />
    </Form>
  );
}

async function AccountLinks({ className }: { className?: string }) {
  const session = await auth();

  if (!session) {
    return (
      <div className={className}>
        <Suspense>
          <AuthLinks />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={className}>
      {session.user.role === "ADMIN" && (
        <a
          href={`//${adminHost(requestHost(await headers()))}/inventory`}
          className="hover:underline"
        >
          Admin
        </a>
      )}
      <span className="text-muted max-w-40 truncate">{session.user.name}</span>
      <SignOutButton />
    </div>
  );
}

export async function StoreHeader() {
  const bagCount = await api.bag.count();
  const shopNav = (className: string) => (
    <nav aria-label="Shop" className={className}>
      {shopLinks.map((link) => (
        <Link key={link.label} href={link.href} className="hover:underline">
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="border-line relative border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/products"
          className="text-lg font-semibold tracking-[0.2em]"
        >
          STYLEGRID
        </Link>

        {shopNav("hidden items-center gap-5 text-sm whitespace-nowrap lg:flex")}

        <SearchBox className="ml-auto hidden w-56 lg:block xl:w-72" />

        <div className="ml-auto flex items-center gap-5 text-sm whitespace-nowrap lg:ml-0">
          <Link href="/orders" className="hidden hover:underline lg:inline">
            Orders
          </Link>
          <BagLink initialCount={bagCount} />
          <AccountLinks className="hidden items-center gap-5 lg:flex" />
          <MobileMenu>
            <SearchBox />
            {shopNav("mt-5 flex flex-col gap-4 text-sm")}
            <div className="border-line mt-5 flex flex-col gap-4 border-t pt-5 text-sm">
              <Link href="/orders">Orders</Link>
              <AccountLinks className="flex flex-col items-start gap-4" />
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
