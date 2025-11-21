"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        redirect: false,
        username,
        password,
        callbackUrl: "/admin",
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/admin");
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-brand-300" />
        <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Secure login</p>
      </div>
      <h2 className="mt-4 text-2xl font-semibold">Administrator console</h2>
      <p className="text-sm text-slate-400">Enter your credentials to continue.</p>

      <div className="mt-8 space-y-4">
        <label className="block text-sm text-slate-300">
          Username
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-brand-400 focus:outline-none"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <div className="mt-1 flex items-center rounded-2xl border border-white/10 bg-slate-950/60 px-4">
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            <input
              className="w-full bg-transparent px-3 py-3 text-white focus:outline-none"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </label>
      </div>

      {error && <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 flex w-full items-center justify-center rounded-2xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 disabled:opacity-70"
      >
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
      </button>
    </form>
  );
}
