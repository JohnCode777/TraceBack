export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="page-hero m-4 flex min-h-[320px] flex-col justify-between overflow-hidden !rounded-3xl p-8 lg:m-6 lg:min-h-0 lg:p-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em]">
            TraceBack
          </p>
          <h1 className="mt-16 max-w-lg text-4xl font-extrabold leading-tight lg:text-6xl">
            Find the signal.
            <br />
            Fix with clarity.
          </h1>
          <p className="mt-6 max-w-md text-lg">
            A calm, shared place to turn bug reports into confident fixes.
          </p>
        </div>
        <div className="mt-12 grid gap-3 text-sm">
          <span className="rounded-xl bg-white/10 p-4">
            ✦ &nbsp; Reports that guide the investigation
          </span>
          <span className="rounded-xl bg-white/10 p-4">
            ◈ &nbsp; A clear path from discovery to verification
          </span>
          <span className="rounded-xl bg-white/10 p-4">
            ↗ &nbsp; Project insights that reveal recurring problems
          </span>
        </div>
      </aside>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md space-y-6">{children}</div>
      </div>
    </main>
  );
}
