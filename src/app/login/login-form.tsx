"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function signIn() {
    setError(null);
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        signIn();
      }}
    >
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink"
        />
      </div>
      {error ? (
        <p className="rounded-lg border border-[#f3bbb5] bg-[#fff0ee] px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
