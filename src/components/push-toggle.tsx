"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";

type PushState =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "blocked"
  | "disabled"
  | "enabled";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(normalized);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushToggle() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function detect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }

      if (!vapidPublicKey) {
        setState("unconfigured");
        return;
      }

      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      setState(subscription ? "enabled" : "disabled");
    }

    detect().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    if (!vapidPublicKey) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState("blocked");
        setMessage("Notifications are blocked for this site in the browser.");
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Saving the subscription failed.");
      }

      setState("enabled");
      setMessage("This device will now receive reminders.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState("disabled");
      setMessage("This device will no longer receive notifications.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const body = await response.json().catch(() => null);

      setMessage(body?.message ?? "Test request sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking") {
    return <p className="mt-5 text-sm text-muted">Checking this device...</p>;
  }

  if (state === "unsupported") {
    return (
      <p className="mt-5 text-sm text-muted">
        This browser does not support push notifications. On iPhone or iPad,
        add the app to the Home Screen first.
      </p>
    );
  }

  if (state === "unconfigured") {
    return (
      <p className="mt-5 text-sm text-muted">
        Push notifications are not configured for this deployment yet. An
        admin needs to add the VAPID keys described in the README.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {state === "blocked" ? (
        <p className="rounded-lg border border-[#eed4a9] bg-[#fff6e8] px-3 py-2 text-sm font-medium text-warning">
          Notifications are blocked in this browser. Allow them for this site
          in the browser settings, then try again.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {state === "enabled" ? (
            <>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-ink shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BellOff className="h-4 w-4" aria-hidden="true" />
                Turn off on this device
              </button>
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-ink shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Send a test
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              Enable on this device
            </button>
          )}
        </div>
      )}
      <div role="status" aria-live="polite">
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
