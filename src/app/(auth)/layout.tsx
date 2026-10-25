export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <div className="w-full space-y-6">
        <h1 className="text-3xl font-bold">TraceBack</h1>
        {children}
      </div>
    </main>
  );
}
