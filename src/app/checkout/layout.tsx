import Link from "next/link";

export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-line border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/products"
            className="text-lg font-semibold tracking-[0.2em]"
          >
            STYLEGRID
          </Link>
          <Link href="/bag" className="text-sm hover:underline">
            Back to bag
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
