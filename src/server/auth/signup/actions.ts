"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "../../../../generated/prisma";
import { z } from "zod";

import { db } from "~/server/db";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters."),
});

type SignupState = {
  error: string;
  success: boolean;
};

export async function createAccount(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check the information entered.",
      success: false,
    };
  }

  if (Buffer.byteLength(parsed.data.password, "utf8") > 72) {
    return {
      error: "Password must be no more than 72 UTF-8 bytes.",
      success: false,
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      error: "An account with this email already exists.",
      success: false,
    };
  }

  const password = await bcrypt.hash(parsed.data.password, 12);

  try {
    await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "An account with this email already exists.",
        success: false,
      };
    }

    throw error;
  }

  return { error: "", success: true };
}
