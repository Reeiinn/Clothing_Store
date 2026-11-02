import { redirect } from "next/navigation";

import { Button } from "~/components/Button";
import { auth, signOut } from "~/server/auth";
import { LoginForm } from "~/app/(store)/login/LoginForm";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user.role === "ADMIN") redirect("/inventory");

  return (
    <section className="mx-auto w-full max-w-sm px-4 py-16">
      <p className="font-semibold tracking-[0.2em]">STYLEGRID</p>
      <h1 className="mt-1 text-2xl font-semibold">Admin sign in</h1>
      {session ? (
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-8 flex flex-col gap-5"
        >
          <p className="text-danger text-sm" role="alert">
            {session.user.email} doesn&apos;t have admin access.
          </p>
          <Button type="submit">Sign out</Button>
        </form>
      ) : (
        <LoginForm callbackUrl="/inventory" />
      )}
    </section>
  );
}
