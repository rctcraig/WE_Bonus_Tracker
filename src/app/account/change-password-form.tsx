"use client";

import { KeyRound } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { changeOwnPassword } from "@/app/account/actions";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (password.length < 8) {
      setStatus({ ok: false, message: "Use at least 8 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ ok: false, message: "Passwords do not match." });
      return;
    }

    startTransition(async () => {
      const result = await changeOwnPassword(password);
      setStatus(result);

      if (result.ok) {
        setPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          className="text-sm font-medium text-ink"
          htmlFor="account-password"
        >
          New password
        </label>
        <input
          id="account-password"
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
          htmlFor="account-confirm-password"
        >
          Confirm password
        </label>
        <input
          id="account-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink"
        />
      </div>

      {status ? (
        <div
          className={
            status.ok
              ? "rounded-lg border border-[#b6d8c4] bg-[#edf7f0] px-4 py-3 text-sm font-medium text-success"
              : "rounded-lg border border-[#f3bbb5] bg-[#fff0ee] px-4 py-3 text-sm font-medium text-danger"
          }
        >
          {status.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Updating password" : "Update password"}
      </button>
    </form>
  );
}
