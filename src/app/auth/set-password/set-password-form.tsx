"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateInvitePassword } from "@/app/auth/set-password/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function activateInviteSession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
        } else {
          window.history.replaceState({}, "", url.pathname);
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(error.message);
        } else {
          window.history.replaceState({}, "", url.pathname);
        }
      }

      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
      setCheckingInvite(false);
    }

    activateInviteSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setReady(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  function updatePassword() {
    setMessage(null);

    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await updateInvitePassword(password);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        updatePassword();
      }}
    >
      {!ready ? (
        <p className="rounded-lg border border-[#eed4a9] bg-[#fff6e8] px-3 py-2 text-sm font-medium text-warning">
          {checkingInvite
            ? "Checking the invite link."
            : "This invite link is not active. Open the newest invite email or request a new invite."}
        </p>
      ) : null}
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink"
        />
      </div>
      <div>
        <label
          className="text-sm font-medium text-ink"
          htmlFor="confirm-password"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink"
        />
      </div>
      {message ? (
        <p className="rounded-lg border border-[#f3bbb5] bg-[#fff0ee] px-3 py-2 text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!ready || isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Saving password" : "Save password"}
      </button>
    </form>
  );
}
