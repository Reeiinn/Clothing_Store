import { StoreFooter } from "~/components/StoreFooter";
import { StoreHeader } from "~/components/StoreHeader";

export default function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
