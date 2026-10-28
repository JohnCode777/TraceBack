"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBugSchema } from "@/lib/validation";
import { evaluate } from "@/lib/completeness";
import { Completeness } from "@/components/ui";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [steps, setSteps] = useState(
    initial?.steps.map((s) => s.instruction) ?? [""],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(() =>
    evaluate({ ...initial, steps: initial?.steps ?? [""] }),
  );
  const updatePreview = (form: HTMLFormElement, currentSteps: string[]) => {
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim() || null;
    setPreview(
      evaluate({
        title: value("title"),
        severity: value("severity"),
        areaId: value("areaId"),
        osName: value("osName"),
        browserOrDevice: value("browserOrDevice"),
        appVersion: value("appVersion"),
        expectedBehaviour: value("expectedBehaviour"),
        actualBehaviour: value("actualBehaviour"),
        reproducibility: value("reproducibility"),
        extraContext: value("extraContext"),
        steps: currentSteps,
      }),
    );
  };
  const changeSteps = (next: string[]) => {
    setSteps(next);
    if (formRef.current) updatePreview(formRef.current, next);
  };
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
    <form
      ref={formRef}
      onSubmit={submit}
      onInput={(event) => updatePreview(event.currentTarget, steps)}
      onChange={(event) => updatePreview(event.currentTarget, steps)}
      className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div className="grid min-w-0 gap-6">
        <section className="card space-y-5">
          <div>
            <p className="eyebrow">01 / Essentials</p>
            <h2 className="section-title">Describe the issue</h2>
            <p className="muted mt-1 text-sm">
              A precise title and priority help the team triage quickly.
            </p>
          </div>
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
        </section>
        <section className="card space-y-5">
          <div>
            <p className="eyebrow">02 / Context</p>
            <h2 className="section-title">Environment</h2>
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
        </section>
        <section className="card space-y-5">
          <div>
            <p className="eyebrow">03 / Reproduce</p>
            <h2 className="section-title">What happened?</h2>
          </div>
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
                      changeSteps(
                        steps.map((s, i) => (i === index ? e.target.value : s)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button-secondary self-end"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() =>
                    changeSteps(steps.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button-secondary w-fit"
              onClick={() => changeSteps([...steps, ""])}
            >
              Add step
            </button>
          </fieldset>
          {field("expectedBehaviour", "Expected behaviour", true)}
          {field("actualBehaviour", "Actual behaviour", true)}
          {field("extraContext", "Extra context", true)}
        </section>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <button disabled={busy} className="button w-fit">
          {busy ? "Saving…" : initial ? "Save changes" : "Create bug"}
        </button>
      </div>
      <section className="card top-6 space-y-3 xl:sticky" aria-live="polite">
        <p className="eyebrow">Live report quality</p>
        <Completeness score={preview.score} level={preview.level} />
        <h2 className="font-semibold">
          Completeness preview: {preview.level} ({preview.score}/100)
        </h2>
        <p className="muted text-sm">Incomplete reports can still be saved.</p>
        {preview.missing.length > 0 && (
          <ul className="list-disc space-y-2 pl-6 text-xs muted">
            {preview.missing.map((gap) => (
              <li key={gap.rule}>
                {gap.rule}: {gap.suggestion}
              </li>
            ))}
          </ul>
        )}
        {preview.warnings.map((warning) => (
          <p key={warning} className="text-amber-800">
            {warning}
          </p>
        ))}
      </section>
    </form>
  );
}
