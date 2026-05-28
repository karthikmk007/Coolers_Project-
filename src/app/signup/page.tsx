"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

  if (state?.success) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-lime flex items-center justify-center mx-auto mb-6">
            <span className="text-ink font-mono text-xl">✓</span>
          </div>
          <h2 className="font-display text-4xl text-ink mb-4">Check your email.</h2>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 leading-relaxed">
            {state.success}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block px-6 py-3 border border-ink/20 font-mono text-[10px] tracking-widest uppercase hover:border-ink transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-ink/10">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-2xl tracking-tight text-ink">Cracked.</span>
          <span className="font-mono text-[10px] tracking-widest uppercase text-ink/40">RTD · ON</span>
        </Link>
        <Link
          href="/login"
          className="font-mono text-[11px] tracking-widest uppercase text-ink/50 hover:text-ink transition-colors"
        >
          Have an account? Sign in →
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mb-3">
            CRACKED · Join the Lab
          </p>

          <h1 className="font-display text-5xl tracking-tight text-ink leading-[0.9] mb-10">
            Create your<br />
            <em className="text-lime-dim">account.</em>
          </h1>

          <form action={action} className="space-y-4">
            {/* Handle */}
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink/40 block mb-2">
                Tasting Handle
              </label>
              <input
                name="handle"
                type="text"
                autoComplete="username"
                required
                minLength={2}
                maxLength={30}
                pattern="[a-zA-Z0-9_.\-]+"
                placeholder="e.g. TorontoML_Recruiter"
                className="w-full border border-ink/20 bg-transparent px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink transition-colors"
              />
              <p className="font-mono text-[9px] text-ink/30 mt-1.5 tracking-wide">
                Letters, numbers, _ - . only. Shown on your reviews.
              </p>
            </div>

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
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="w-full border border-ink/20 bg-transparent px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            {/* Error */}
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
              {pending ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-ink/30 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-vermilion hover:text-vermilion-dim transition-colors">
              Sign in
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
