"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">
            ✝
          </div>
          <h1 className="text-xl font-bold">Door of Hope Assembly of God</h1>
          <p className="text-sm text-gray-600">Member care &amp; attendance</p>
        </div>
        <form action={action} className="card space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          Forgot your password? Ask the church admin to reset it.
        </p>
      </div>
    </main>
  );
}
