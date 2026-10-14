"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "~/components/Button";
import { TextField } from "~/components/TextField";
import { createAccount } from "~/server/auth/signup/actions";

const initialState = {
  error: "",
  success: false,
};

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, isPending] = useActionState(
    createAccount,
    initialState,
  );
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <section className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>

      {state.success ? (
        <div className="bg-ok-bg text-ok mt-8 p-4 text-sm" role="status">
          Your account was created.{" "}
          <Link
            href={loginHref}
            className="font-medium underline underline-offset-4"
          >
            Sign in
          </Link>
          .
        </div>
      ) : (
        <form action={formAction} className="mt-8 flex flex-col gap-5">
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            maxLength={100}
            required
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            hint="At least 8 characters."
            required
          />
          {state.error && (
            <p className="text-danger text-sm" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" loading={isPending}>
            Create account
          </Button>
        </form>
      )}

      {!state.success && (
        <p className="text-muted mt-6 text-sm">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="text-ink underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      )}
    </section>
  );
}
