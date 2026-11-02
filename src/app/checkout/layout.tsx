import Link from "next/link";

export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-line border-b bg-white">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <Link
            href="/products"
            className="text-lg font-semibold tracking-[0.2em]"
          >
            STYLEGRID
          </Link>
          <p className="hidden font-mono text-[13px] tracking-[0.08em] sm:block">
            SECURE CHECKOUT
          </p>
          <Link
            href="/bag"
            className="col-start-3 justify-self-end text-sm underline underline-offset-2 hover:no-underline"
          >
            ← Back to bag
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
