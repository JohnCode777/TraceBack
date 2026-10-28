"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestReopenReason } from "@/lib/verification";

type Step = { id: string; position: number; instruction: string };
type Mark = { stepId: string; result: "Pass" | "Fail" | ""; comment: string };

export function VerificationChecklist({
  projectId,
  bugId,
  steps,
}: {
  projectId: string;
  bugId: string;
  steps: Step[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [marks, setMarks] = useState<Mark[]>(
    steps.map((step) => ({ stepId: step.id, result: "", comment: "" })),
  );
  const [problemOccurs, setProblemOccurs] = useState<"Yes" | "No" | "">("");
  const [finalComment, setFinalComment] = useState("");
  const [reasonEdit, setReasonEdit] = useState<string | null>(null);
  const [error, setError] = useState("");
  const checked = marks.filter((mark) => mark.result !== "").length;
  const complete = checked === steps.length && problemOccurs !== "";
  const failed =
    marks.some((mark) => mark.result === "Fail") || problemOccurs === "Yes";
  const suggestion = suggestReopenReason(steps, {
    steps: marks,
    problemOccurs,
    finalComment,
  });

  async function submit(to: "Verified" | "Investigating") {
    setError("");
    const comment =
      to === "Investigating" ? (reasonEdit ?? suggestion).trim() : undefined;
    if (to === "Investigating" && !comment) {
      setError("Reopen requires a reason");
      return;
    }
    if (
      !window.confirm(
        to === "Verified" ? "Verify this fix?" : "Reopen this bug?",
      )
    )
      return;
    const response = await fetch(
      `/api/projects/${projectId}/bugs/${bugId}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          comment,
          verification: {
            steps: marks.map((mark) => ({
              stepId: mark.stepId,
              result: mark.result,
              comment: mark.comment,
            })),
            problemOccurs,
            finalComment,
          },
        }),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not save verification");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        className="rounded bg-slate-900 px-4 py-2 text-white"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide checklist" : "Verify"}
      </button>
      {open && (
        <div className="mt-4 grid gap-4">
          <p aria-live="polite">
            {checked} of {steps.length} steps checked
          </p>
          {steps.map((step, index) => (
            <fieldset key={step.id} className="rounded border p-3">
              <legend className="font-semibold">
                Step {step.position}: {step.instruction}
              </legend>
              <div className="flex gap-4">
                {(["Pass", "Fail"] as const).map((result) => (
                  <label key={result} className="flex gap-1">
                    <input
                      type="radio"
                      name={`step-${step.id}`}
                      checked={marks[index].result === result}
                      onChange={() =>
                        setMarks(
                          marks.map((mark, i) =>
                            i === index ? { ...mark, result } : mark,
                          ),
                        )
                      }
                    />
                    {result}
                  </label>
                ))}
              </div>
              <label className="mt-2 block">
                Comment (optional)
                <textarea
                  className="block w-full border p-2"
                  value={marks[index].comment}
                  onChange={(event) =>
                    setMarks(
                      marks.map((mark, i) =>
                        i === index
                          ? { ...mark, comment: event.target.value }
                          : mark,
                      ),
                    )
                  }
                />
              </label>
            </fieldset>
          ))}
          <fieldset className="rounded border p-3">
            <legend className="font-semibold">
              Does the original problem still occur?
            </legend>
            <div className="flex gap-4">
              {(["Yes", "No"] as const).map((answer) => (
                <label key={answer} className="flex gap-1">
                  <input
                    type="radio"
                    name="problemOccurs"
                    checked={problemOccurs === answer}
                    onChange={() => setProblemOccurs(answer)}
                  />
                  {answer}
                </label>
              ))}
            </div>
            <label className="mt-2 block">
              Comment (optional)
              <textarea
                className="block w-full border p-2"
                value={finalComment}
                onChange={(event) => setFinalComment(event.target.value)}
              />
            </label>
          </fieldset>
          {complete && failed && (
            <label>
              Reopen reason
              <textarea
                className="block w-full border p-2"
                value={reasonEdit ?? suggestion}
                onChange={(event) => setReasonEdit(event.target.value)}
                required
              />
            </label>
          )}
          <div className="flex gap-3">
            {complete && !failed && (
              <button
                type="button"
                className="rounded bg-slate-900 px-4 py-2 text-white"
                onClick={() => submit("Verified")}
              >
                Save verification
              </button>
            )}
            {complete && failed && (
              <button
                type="button"
                className="rounded bg-slate-900 px-4 py-2 text-white"
                onClick={() => submit("Investigating")}
              >
                Reopen
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
