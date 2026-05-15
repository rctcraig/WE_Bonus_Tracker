"use client";

import { Send } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { inviteUser } from "@/app/admin/actions";
import { roleLabels } from "@/lib/roles";
import type { Role } from "@/lib/types";

type InviteFormProps = {
  roles: Role[];
};

export function InviteForm({ roles }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>(roles[0] ?? "leadership");
  const [status, setStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      const result = await inviteUser({
        email,
        fullName,
        role,
      });

      setStatus(result);

      if (result.ok) {
        setEmail("");
        setFullName("");
        setRole(roles[0] ?? "leadership");
      }
    });
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="invite-name"
          className="text-xs font-semibold uppercase tracking-[0.08em] text-muted"
        >
          Full name
        </label>
        <input
          id="invite-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink outline-none transition focus:border-ink"
          placeholder="Office manager"
        />
      </div>
      <div>
        <label
          htmlFor="invite-email"
          className="text-xs font-semibold uppercase tracking-[0.08em] text-muted"
        >
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink outline-none transition focus:border-ink"
          placeholder="name@example.com"
        />
      </div>
      <div>
        <label
          htmlFor="invite-role"
          className="text-xs font-semibold uppercase tracking-[0.08em] text-muted"
        >
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink outline-none transition focus:border-ink"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {roleLabels[item]}
            </option>
          ))}
        </select>
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
        <Send className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Sending invite" : "Send invite"}
      </button>
    </form>
  );
}
