"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function AuthLinks() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = search ? `${pathname}?${search}` : pathname;
  const query =
    pathname === "/login" || pathname === "/signup"
      ? ""
      : `?callbackUrl=${encodeURIComponent(current)}`;

  return (
    <>
      <Link href={`/login${query}`} className="hover:underline">
        Sign in
      </Link>
      <Link href={`/signup${query}`} className="hover:underline">
        Sign up
      </Link>
    </>
  );
}
