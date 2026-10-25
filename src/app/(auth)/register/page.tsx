import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { registerAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
export default async function RegisterPage() {
  if (await auth()) redirect("/projects");
  return (
    <section className="card space-y-5">
      <h2 className="text-xl font-semibold">Create an account</h2>
      <ActionForm action={registerAction} submit="Register">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
          />
        </div>
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
          <label htmlFor="password">Password (at least 12 characters)</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </div>
      </ActionForm>
      <Link className="text-sm text-blue-700 underline" href="/login">
        Already have an account? Sign in
      </Link>
    </section>
  );
}
