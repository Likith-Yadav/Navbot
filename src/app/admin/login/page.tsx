import Link from "next/link";

import { LoginForm } from "./_components/login-form";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
        <section className="space-y-6 lg:w-1/2">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Admin access</p>
          <h1 className="text-4xl font-semibold leading-tight">Sign in to manage maps & routes</h1>
          <p className="text-slate-300">
            Upload floor plans, curate pins, and orchestrate voice guidance from a single dashboard. Use your administrator
            credentials to continue.
          </p>

          <Link href="/" className="text-sm text-slate-400 hover:text-brand-200">
            ← Back to public site
          </Link>
        </section>

        <section className="w-full lg:w-1/2">
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
