import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { safeCallbackUrl } from "~/server/auth/callback-url";

import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);

  if (await auth()) redirect(callbackUrl);

  return <SignupForm callbackUrl={callbackUrl} />;
}
