"use server";

import { AuthError } from "next-auth";

import { signIn } from "~/server/auth";
import { safeCallbackUrl } from "~/server/auth/callback-url";

type LoginState = { error: string; email: string };

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Incorrect email or password.",
        email: typeof email === "string" ? email : "",
      };
    }
    throw error;
  }

  return { error: "", email: "" };
}
