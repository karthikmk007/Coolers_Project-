"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/home";
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {/* Email */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-cracked-muted block mb-1.5 font-[family-name:var(--font-dm-sans)] font-semibold">
          Email
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-cracked-dark placeholder:text-neutral-400 focus:outline-none focus:border-cracked-orange transition-colors font-[family-name:var(--font-dm-sans)]"
        />
      </div>

      {/* Password */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-cracked-muted block mb-1.5 font-[family-name:var(--font-dm-sans)] font-semibold">
          Password
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-cracked-dark placeholder:text-neutral-400 focus:outline-none focus:border-cracked-orange transition-colors font-[family-name:var(--font-dm-sans)]"
        />
      </div>

      {/* Error / confirmation hint */}
      {searchParams.get("error") === "confirmation_failed" && !state?.error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-[family-name:var(--font-dm-sans)]">
          Email confirmation failed or link expired. Try signing up again.
        </p>
      )}
      {state?.error && (
        <p className="text-xs text-cracked-orange bg-cracked-orange/10 border border-cracked-orange/20 rounded-xl px-3 py-2 font-[family-name:var(--font-dm-sans)]">
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3.5 bg-cracked-orange text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2 font-[family-name:var(--font-dm-sans)]"
      >
        {pending ? "Signing in…" : "Sign In →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cracked-cream flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="block mb-10 text-center">
          <span
            className="text-cracked-dark"
            style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 36 }}
          >
            CRACKED.
          </span>
        </Link>

        <p className="text-[10px] tracking-widest uppercase text-cracked-orange mb-2 font-[family-name:var(--font-dm-sans)] font-bold">
          What&apos;s cracking
        </p>
        <h1
          className="text-cracked-dark leading-tight mb-8"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 44 }}
        >
          Welcome back.
        </h1>

        <Suspense fallback={<div className="h-48 animate-pulse bg-white/60 rounded-2xl" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-xs text-cracked-muted text-center font-[family-name:var(--font-dm-sans)]">
          No account?{" "}
          <Link href="/signup" className="text-cracked-orange font-semibold">
            Create one →
          </Link>
        </p>
      </div>
    </div>
  );
}
