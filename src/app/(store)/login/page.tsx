import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { safeCallbackUrl } from "~/server/auth/callback-url";

import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);

  if (await auth()) redirect(callbackUrl);

  return (
    <section className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <LoginForm callbackUrl={callbackUrl} />
      <p className="text-muted mt-6 text-sm">
        New here?{" "}
        <Link
          href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-ink underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
