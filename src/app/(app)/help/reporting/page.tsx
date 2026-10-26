import Link from "next/link";

export default function ReportingHelpPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">How to write a good bug report</h1>
        <p className="mt-2 text-slate-700">
          Give another person enough detail to see the same failure and check
          that a fix works.
        </p>
      </div>
      <ol className="list-decimal space-y-4 pl-6">
        <li>
          <strong>Name the problem precisely.</strong> Describe what failed and
          where, such as “Saving a report shows an error,” rather than “Broken.”
        </li>
        <li>
          <strong>Set the context.</strong> Choose severity and area, then add
          the operating system, browser or device, app version, environment and
          how often it happens.
        </li>
        <li>
          <strong>Write steps in order.</strong> Start from a known screen and
          use one action per step. Include at least two steps that a developer
          can repeat.
        </li>
        <li>
          <strong>Separate expected from actual.</strong> Say what you expected
          to see and what appeared instead. Include the exact error text when
          useful.
        </li>
        <li>
          <strong>Add safe evidence.</strong> For High or Critical bugs, include
          a relevant log excerpt, error text or link. Remove passwords, tokens
          and personal data before pasting anything.
        </li>
      </ol>
      <p className="rounded border border-blue-200 bg-blue-50 p-4 text-blue-950">
        You can submit an incomplete report. TraceBack shows its score and the
        specific details that would make it easier to investigate.
      </p>
      <Link className="font-medium text-blue-700 underline" href="/projects">
        Back to projects
      </Link>
    </main>
  );
}
