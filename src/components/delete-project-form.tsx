"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function DeleteProjectForm({
  projectId,
  projectKey,
}: {
  projectId: string;
  projectKey: string;
}) {
  const router = useRouter();
  const [confirmationKey, setConfirmationKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationKey }),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? "Could not delete project.");
        return;
      }
      router.replace("/projects");
      router.refresh();
    } catch {
      setError("Could not delete project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="field max-w-md">
        <label htmlFor="delete-project-key">Type {projectKey} to confirm</label>
        <input
          id="delete-project-key"
          value={confirmationKey}
          onChange={(event) => setConfirmationKey(event.target.value)}
          autoComplete="off"
          required
          maxLength={5}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !confirmationKey}
        className="inline-flex items-center justify-center rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete project"}
      </button>
    </form>
  );
}
