"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPasswordRuleResults, isStrongPassword } from "@/lib/password-rules";

const processingSteps = [
  "Verifying current password...",
  "Securing your new password...",
  "Updating account credentials..."
];

export function ResetPasswordCard({ userEmail }: { userEmail: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const passwordResults = getPasswordRuleResults(newPassword);
  const passwordReady = isStrongPassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = Boolean(currentPassword.trim()) && passwordReady && passwordsMatch && !loading;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Enter your current password, create a strong new password, and confirm it correctly.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);
    setProcessingText(processingSteps[0]);
    processingSteps.forEach((text, index) => {
      window.setTimeout(() => setProcessingText(text), index * 650);
    });

    const response = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    const data = await response.json().catch(() => null);

    window.setTimeout(() => {
      setLoading(false);
      setProcessingText("");

      if (!response.ok) {
        if (localDemoUserExists(userEmail)) {
          updateLocalDemoUserPassword(userEmail, currentPassword, newPassword)
            .then((updated) => {
              if (!updated) {
                setError(data?.message ?? "Current password is incorrect.");
                return;
              }

              clearForm();
              setMessage("Password updated successfully.");
            })
            .catch(() => setError(data?.message ?? "Password could not be updated. Please try again."));
          return;
        }

        setError(data?.message ?? "Password could not be updated. Please try again.");
        return;
      }

      clearForm();
      setMessage(data?.message ?? "Password updated successfully.");
    }, processingSteps.length * 650 + 150);
  }

  function clearForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 text-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss dark:text-emerald-300">Account security</p>
        <h2 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">Reset Password</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
          Verify your current password, then choose a stronger password for your SkillPilot AI account.
        </p>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <Input label="Current password" name="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        <Input label="New password" name="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        <Input label="Confirm new password" name="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />

        <PasswordChecklist results={passwordResults} passwordsMatch={passwordsMatch} />

        {processingText ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100" aria-live="polite">
            {processingText}
            <span className="ml-2 inline-flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.24s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.12s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
            </span>
          </div>
        ) : null}

        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" aria-live="polite">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200" aria-live="assertive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!canSubmit}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
          <Button type="button" variant="secondary" onClick={clearForm} disabled={loading || (!currentPassword && !newPassword && !confirmPassword)}>
            Cancel / Clear
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordChecklist({
  results,
  passwordsMatch
}: {
  results: Array<{ id: string; label: string; passed: boolean }>;
  passwordsMatch: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
      <p className="font-bold text-slate-900 dark:text-slate-100">New password must include:</p>
      <ul className="mt-2 grid gap-1">
        {results.map((rule) => (
          <li key={rule.id} className={rule.passed ? "flex items-center gap-2 text-emerald-700 dark:text-emerald-300" : "flex items-center gap-2 text-slate-600 dark:text-slate-300"}>
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs font-black">
              {rule.passed ? "OK" : "-"}
            </span>
            <span>{rule.label}</span>
          </li>
        ))}
        <li className={passwordsMatch ? "flex items-center gap-2 text-emerald-700 dark:text-emerald-300" : "flex items-center gap-2 text-slate-600 dark:text-slate-300"}>
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs font-black">
            {passwordsMatch ? "OK" : "-"}
          </span>
          <span>Confirm password matches</span>
        </li>
      </ul>
    </div>
  );
}

function localDemoUserExists(email: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem("skillpilot_demo_users") ?? "[]") as Array<{ email?: string }>;
    return stored.some((user) => user.email?.toLowerCase() === email.trim().toLowerCase());
  } catch {
    return false;
  }
}

async function updateLocalDemoUserPassword(email: string, currentPassword: string, newPassword: string) {
  const stored = JSON.parse(window.localStorage.getItem("skillpilot_demo_users") ?? "[]") as Array<Record<string, unknown>>;
  const normalized = email.trim().toLowerCase();
  const currentHash = await hashDemoPassword(currentPassword);
  const newHash = await hashDemoPassword(newPassword);
  let updated = false;
  const next = stored.map((user) => {
    if (String(user.email ?? "").toLowerCase() !== normalized) {
      return user;
    }

    if (typeof user.passwordHash === "string" && user.passwordHash !== currentHash) {
      return user;
    }

    if (typeof user.password === "string" && user.password !== currentPassword) {
      return user;
    }

    updated = true;
    return {
      ...user,
      passwordHash: newHash,
      password: undefined,
      passwordUpdatedAt: new Date().toISOString()
    };
  });

  if (updated) {
    window.localStorage.setItem("skillpilot_demo_users", JSON.stringify(next));
  }

  return updated;
}

async function hashDemoPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return `sha256:${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
