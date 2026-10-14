"use client";

import { useActionState } from "react";

import { Button } from "~/components/Button";
import { TextField } from "~/components/TextField";
import { login } from "~/server/auth/login/actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, isPending] = useActionState(login, {
    error: "",
    email: "",
  });

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        required
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={isPending}>
        Sign in
      </Button>
    </form>
  );
}
