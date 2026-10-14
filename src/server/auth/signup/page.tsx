"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createAccount } from "./actions";

const initialState = {
  error: "",
  success: false,
};

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    createAccount,
    initialState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur sm:p-10">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-purple-200 transition hover:text-white"
        >
          Clothing Store
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-white/70">Sign up to get started.</p>
        </div>

        {state.success ? (
          <div
            className="mt-8 rounded-lg border border-green-300/30 bg-green-300/10 p-4 text-sm text-green-100"
            role="status"
          >
            Your account was created.{" "}
            <Link
              href="/api/auth/signin"
              className="font-semibold underline underline-offset-4 hover:text-white"
            >
              Sign in
            </Link>
            .
          </div>
        ) : (
          <form action={formAction} className="mt-8 flex flex-col gap-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Name
              </label>
              <input
                autoComplete="name"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 text-white transition outline-none placeholder:text-white/40 focus:border-purple-300 focus:ring-2 focus:ring-purple-300/30"
                id="name"
                maxLength={100}
                name="name"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <input
                autoComplete="email"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 text-white transition outline-none placeholder:text-white/40 focus:border-purple-300 focus:ring-2 focus:ring-purple-300/30"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 text-white transition outline-none placeholder:text-white/40 focus:border-purple-300 focus:ring-2 focus:ring-purple-300/30"
                id="password"
                maxLength={72}
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type="password"
              />
              <p className="mt-2 text-xs text-white/55">
                Use at least 8 characters. Maximum: 72 UTF-8 bytes.
              </p>
            </div>

            {state.error && (
              <p className="text-sm text-red-200" role="alert">
                {state.error}
              </p>
            )}

            <button
              className="rounded-lg bg-purple-500 px-4 py-3 font-semibold transition hover:bg-purple-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        {!state.success && (
          <p className="mt-6 text-center text-sm text-white/70">
            Already have an account?{" "}
            <Link
              href="/api/auth/signin"
              className="font-semibold text-purple-200 underline-offset-4 hover:text-white hover:underline"
            >
              Sign in
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
