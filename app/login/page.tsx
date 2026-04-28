import { login } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">AskBen</h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>

        <form action={login} className="space-y-6">
          <input
            name="email"
            type="email"
            defaultValue="kakr0901@icloud.com"
            placeholder="Email address"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-cyan-400 outline-none"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-cyan-400 outline-none"
            required
          />

          {searchParams.error && (
            <p className="text-red-400 text-sm text-center">{searchParams.error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-400 py-3.5 font-semibold text-black hover:bg-cyan-300 transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
