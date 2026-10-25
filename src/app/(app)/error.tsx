"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card space-y-3" role="alert">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p>Please try again.</p>
      <button className="button" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
