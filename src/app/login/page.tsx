"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/browse";
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="space-y-4">
      {/* Pass the redirect target through the form */}
      <input type="hidden" name="next" value={next} />

      {/* Email */}
      <div>
        <label className="font-mono text-[9px] uppercase tracking-widest text-ink/40 block mb-2">
          Email Address
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full border border-ink/20 bg-transparent px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      {/* Password */}
      <div>
        <label className="font-mono text-[9px] uppercase tracking-widest text-ink/40 block mb-2">
          Password
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full border border-ink/20 bg-transparent px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      {/* Error / confirmation hint */}
      {searchParams.get("error") === "confirmation_failed" && !state?.error && (
        <p className="font-mono text-[10px] text-amber tracking-wide border border-amber/20 bg-amber/5 px-3 py-2">
          Email confirmation failed or link expired. Try signing up again.
        </p>
      )}
      {state?.error && (
        <p className="font-mono text-[10px] text-vermilion tracking-wide border border-vermilion/20 bg-vermilion/5 px-3 py-2">
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3.5 bg-ink text-cream font-mono text-[11px] font-bold tracking-widest uppercase hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
      >
        {pending ? "Signing in…" : "Sign In →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-ink/10">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-2xl tracking-tight text-ink">Cracked.</span>
          <span className="font-mono text-[10px] tracking-widest uppercase text-ink/40">RTD · ON</span>
        </Link>
        <Link
          href="/signup"
          className="font-mono text-[11px] tracking-widest uppercase text-ink/50 hover:text-ink transition-colors"
        >
          New here? Sign up →
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mb-3">
            CRACKED · Auth Layer
          </p>

          <h1 className="font-display text-5xl tracking-tight text-ink leading-[0.9] mb-10">
            Welcome<br />
            <em className="text-vermilion">back.</em>
          </h1>

          <Suspense fallback={<div className="h-40 animate-pulse bg-ink/5" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-ink/30 text-center">
            No account?{" "}
            <Link href="/signup" className="text-vermilion hover:text-vermilion-dim transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-ink/10">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink/20 text-center">
          CRACKED · ML-Engineered RTD Catalogue · Ontario
        </p>
      </footer>
    </div>
  );
}
