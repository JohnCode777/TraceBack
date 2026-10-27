import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { loginAction } from "@/app/actions";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  if (await auth()) redirect("/projects");
  const params = await searchParams;
  return (
    <section className="card space-y-6 !p-8">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2 className="text-3xl font-bold">Sign in</h2>
        <p className="muted mt-2 text-sm">
          Continue to your projects and reports.
        </p>
      </div>
      {params.registered && (
        <p className="text-green-700">Account created. Sign in to continue.</p>
      )}
      <ActionForm action={loginAction} submit="Sign in">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      </ActionForm>
      <p className="text-sm">
        New here?{" "}
        <Link className="accent-text font-semibold underline" href="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}
