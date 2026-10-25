"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBugSchema } from "@/lib/validation";

type Area = { id: string; name: string };
type Initial = {
  id: string;
  title: string;
  severity: string | null;
  reproducibility: string | null;
  areaId: string | null;
  osName: string | null;
  osVersion: string | null;
  browserOrDevice: string | null;
  appVersion: string | null;
  envType: string | null;
  expectedBehaviour: string | null;
  actualBehaviour: string | null;
  extraContext: string | null;
  steps: { instruction: string }[];
};
export function BugForm({
  projectId,
  areas,
  initial,
}: {
  projectId: string;
  areas: Area[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState(
    initial?.steps.map((s) => s.instruction) ?? [""],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    const parsed = createBugSchema.safeParse({
      title: value("title"),
      severity: value("severity"),
      reproducibility: value("reproducibility"),
      areaId: value("areaId"),
      osName: value("osName"),
      osVersion: value("osVersion"),
      browserOrDevice: value("browserOrDevice"),
      appVersion: value("appVersion"),
      envType: value("envType"),
      expectedBehaviour: value("expectedBehaviour"),
      actualBehaviour: value("actualBehaviour"),
      extraContext: value("extraContext"),
      steps: steps.map((s) => s.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/bugs${initial ? `/${initial.id}` : ""}`,
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save bug");
      router.push(`/projects/${projectId}/bugs/${initial?.id ?? result.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save bug");
    } finally {
      setBusy(false);
    }
  }
  const field = (name: keyof Initial, label: string, multiline = false) => (
    <label className="block" key={name}>
      {label}
      {multiline ? (
        <textarea
          className="mt-1 block w-full border p-2"
          name={name}
          defaultValue={String(initial?.[name] ?? "")}
          rows={3}
        />
      ) : (
        <input
          className="mt-1 block w-full border p-2"
          name={name}
          defaultValue={String(initial?.[name] ?? "")}
        />
      )}
    </label>
  );
  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      {field("title", "Title")}
      <div className="grid gap-4 md:grid-cols-3">
        <label>
          Severity
          <select
            className="mt-1 block w-full border p-2"
            name="severity"
            defaultValue={initial?.severity ?? ""}
          >
            <option value="">Unspecified</option>
            {["Critical", "High", "Medium", "Low"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Reproducibility
          <select
            className="mt-1 block w-full border p-2"
            name="reproducibility"
            defaultValue={initial?.reproducibility ?? ""}
          >
            <option value="">Unspecified</option>
            {["Always", "Sometimes", "Rarely", "Once"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select
            className="mt-1 block w-full border p-2"
            name="areaId"
            defaultValue={initial?.areaId ?? ""}
          >
            <option value="">Unspecified</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {field("osName", "OS name")}
        {field("osVersion", "OS version")}
        {field("browserOrDevice", "Browser or device")}
        {field("appVersion", "App version")}
      </div>
      <label>
        Environment
        <select
          className="mt-1 block w-full border p-2"
          name="envType"
          defaultValue={initial?.envType ?? ""}
        >
          <option value="">Unspecified</option>
          {["Production", "Staging", "Development"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="font-semibold">Reproduction steps</legend>
        {steps.map((step, index) => (
          <div className="flex gap-2" key={index}>
            <label className="flex-1">
              Step {index + 1}
              <input
                className="mt-1 block w-full border p-2"
                value={step}
                onChange={(e) =>
                  setSteps(
                    steps.map((s, i) => (i === index ? e.target.value : s)),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="self-end border p-2"
              onClick={() => setSteps(steps.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="w-fit underline"
          onClick={() => setSteps([...steps, ""])}
        >
          Add step
        </button>
      </fieldset>
      {field("expectedBehaviour", "Expected behaviour", true)}
      {field("actualBehaviour", "Actual behaviour", true)}
      {field("extraContext", "Extra context", true)}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="w-fit rounded bg-slate-900 p-2 text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : initial ? "Save changes" : "Create bug"}
      </button>
    </form>
  );
}
