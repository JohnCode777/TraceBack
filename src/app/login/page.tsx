import { signIn } from "@/lib/auth";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  }
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form action={login} className="mt-6 grid gap-4">
        <label>
          Email
          <input
            className="block w-full border p-2"
            name="email"
            type="email"
            required
          />
        </label>
        <label>
          Password
          <input
            className="block w-full border p-2"
            name="password"
            type="password"
            required
          />
        </label>
        <button className="rounded bg-slate-900 p-2 text-white">Sign in</button>
      </form>
    </main>
  );
}
