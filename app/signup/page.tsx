export default function SignupPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-xl px-6 py-20">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight">Start Free</h1>
          <p className="mt-2 text-zinc-600">
            Auth coming next. For now this is your clean SaaS shell.
          </p>

          <div className="mt-6 grid gap-3">
            <input
              type="email"
              placeholder="Email"
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />
            <input
              type="password"
              placeholder="Password"
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />
            <button className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white">
              Create account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
