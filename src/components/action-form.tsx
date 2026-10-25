"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export function ActionForm({
  action,
  submit,
  children,
  className = "",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className={`space-y-4 ${className}`}>
      {children}
      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Working…" : submit}
      </button>
    </form>
  );
}
