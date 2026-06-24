"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

  // Only reached if email confirmation is left ON in Supabase.
  if (state?.success) {
    return (
      <div className="min-h-screen bg-cracked-cream flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-cracked-lime flex items-center justify-center mx-auto mb-6 text-2xl">
            ✓
          </div>
          <h2
            className="text-cracked-dark mb-3"
            style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 36 }}
          >
            Check your email.
          </h2>
          <p className="text-sm text-cracked-muted leading-relaxed font-[family-name:var(--font-dm-sans)]">
            {state.success}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block px-6 py-3 border border-neutral-200 rounded-2xl text-xs font-semibold uppercase tracking-widest text-cracked-muted hover:border-cracked-orange transition-colors font-[family-name:var(--font-dm-sans)]"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

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
          Join the crew
        </p>
        <h1
          className="text-cracked-dark leading-tight mb-8"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 44 }}
        >
          Create your account.
        </h1>

        <form action={action} className="space-y-4">
          {/* Handle */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-cracked-muted block mb-1.5 font-[family-name:var(--font-dm-sans)] font-semibold">
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
              placeholder="e.g. patio_sipper"
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-cracked-dark placeholder:text-neutral-400 focus:outline-none focus:border-cracked-orange transition-colors font-[family-name:var(--font-dm-sans)]"
            />
            <p className="text-[10px] text-cracked-muted mt-1.5 font-[family-name:var(--font-dm-sans)]">
              Letters, numbers, _ - . only. Shown on your reviews.
            </p>
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-cracked-dark placeholder:text-neutral-400 focus:outline-none focus:border-cracked-orange transition-colors font-[family-name:var(--font-dm-sans)]"
            />
          </div>

          {/* Error */}
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
            {pending ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <p className="mt-8 text-xs text-cracked-muted text-center font-[family-name:var(--font-dm-sans)]">
          Already have an account?{" "}
          <Link href="/login" className="text-cracked-orange font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
