"use client";

import { MailPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { sendSetupLink } from "@/app/admin/actions";

type SendSetupLinkButtonProps = {
  userId: string;
};

export function SendSetupLinkButton({ userId }: SendSetupLinkButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleClick() {
    setStatus(null);
    startTransition(async () => {
      const result = await sendSetupLink(userId);
      setStatus(result);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MailPlus className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Sending" : "Send setup link"}
      </button>
      {status ? (
        <p
          className={
            status.ok
              ? "max-w-64 text-xs font-medium text-success"
              : "max-w-64 text-xs font-medium text-danger"
          }
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
