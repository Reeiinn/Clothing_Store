import Link from "next/link";

import { buttonStyles } from "~/components/Button";
import { auth } from "~/server/auth";

import { BagView } from "./BagView";

export default async function BagPage() {
  const session = await auth();

  // bag.get needs a signed-in user, so don't call it for guests
  if (!session) {
    return (
      <div className="flex flex-col items-start gap-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">Your bag</h1>
        <div className="border-ink flex w-full flex-col items-start gap-4 border p-8">
          <p className="text-lg font-medium">Sign in to see your bag</p>
          <p className="text-muted text-sm">
            Your bag is saved to your account, so you can pick up where you left
            off.
          </p>
          <Link
            href="/login?callbackUrl=/bag"
            className={buttonStyles({ variant: "primary" })}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return <BagView />;
}
