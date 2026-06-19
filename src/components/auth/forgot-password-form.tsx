"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPasswordRuleResults, isStrongPassword } from "@/lib/password-rules";

type Step = "email" | "code" | "password" | "success";

const mockCode = "123456";
const verifySteps = ["Checking reset code...", "Verifying account...", "Preparing password reset..."];
const resetSteps = ["Securing your new password...", "Updating account credentials...", "Redirecting to login..."];

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const passwordResults = getPasswordRuleResults(newPassword);
  const passwordReady = isStrongPassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function checkEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const response = await fetch("/api/auth/forgot-password/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok || !data?.exists) {
      if (localDemoUserExists(email)) {
        setStep("code");
        setMessage("A mock reset code has been sent to your local demo profile.");
        setCode("");
        setLoading(true);
        window.setTimeout(() => {
          setCode(mockCode);
          setLoading(false);
        }, 850);
        return;
      }

      setError(data?.message ?? "No account was found with this email.");
      return;
    }

    setStep("code");
    setMessage("A mock reset code has been sent to your email.");
    setCode("");
    setLoading(true);
    window.setTimeout(() => {
      setCode(mockCode);
      setLoading(false);
    }, 850);
  }

  function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (code.trim() !== mockCode) {
      setError("That reset code does not match. Use the mock code 123456.");
      return;
    }

    runProcessing(verifySteps, () => {
      setStep("password");
      setMessage("Code verified. Create your new password.");
    });
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!passwordReady || !passwordsMatch) {
      setError("Create a strong password and make sure both passwords match.");
      return;
    }

    setLoading(true);
    setProcessingText(resetSteps[0]);
    resetSteps.forEach((text, index) => {
      window.setTimeout(() => setProcessingText(text), index * 650);
    });

    const response = await fetch("/api/auth/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        password: newPassword
      })
    });
    const data = await response.json().catch(() => null);

    window.setTimeout(() => {
      setLoading(false);
      setProcessingText("");

      if (!response.ok) {
        if (localDemoUserExists(email)) {
          updateLocalDemoUserPassword(email, newPassword)
            .then(() => {
              setStep("success");
              setMessage("Password reset successful. Please sign in with your new password.");
              window.setTimeout(() => router.push("/login"), 1200);
            })
            .catch(() => {
              setError(data?.message ?? "Password reset could not be completed. Please try again.");
            });
          return;
        }

        setError(data?.message ?? "Password reset could not be completed. Please try again.");
        return;
      }

      setStep("success");
      setMessage("Password reset successful. Please sign in with your new password.");
      window.setTimeout(() => router.push("/login"), 1200);
    }, resetSteps.length * 650 + 200);
  }

  function runProcessing(steps: string[], onComplete: () => void) {
    setLoading(true);
    setProcessingText(steps[0]);
    steps.forEach((text, index) => {
      window.setTimeout(() => setProcessingText(text), index * 650);
    });
    window.setTimeout(() => {
      setLoading(false);
      setProcessingText("");
      onComplete();
    }, steps.length * 650 + 150);
  }

  return (
    <div className="grid gap-4">
      <StepIndicator step={step} />

      {step === "email" ? (
        <form className="grid gap-4" onSubmit={checkEmail}>
          <Input label="Account email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <p className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
            This is a mock reset. SkillPilot checks the account, then shows the demo code on screen.
          </p>
          <Button type="submit" disabled={loading || !email.trim()}>
            {loading ? "Checking account..." : "Send reset code"}
          </Button>
        </form>
      ) : null}

      {step === "code" ? (
        <form className="grid gap-4" onSubmit={verifyCode}>
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
            A mock reset code has been sent to {email}. Demo code: <strong>{mockCode}</strong>
          </p>
          <Input label="Reset code" name="code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Auto-filling code..." : "Verify code"}
          </Button>
        </form>
      ) : null}

      {step === "password" ? (
        <form className="grid gap-4" onSubmit={resetPassword}>
          <Input label="New password" name="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <Input label="Confirm password" name="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <PasswordChecklist results={passwordResults} passwordsMatch={passwordsMatch} />
          <Button type="submit" disabled={loading || !passwordReady || !passwordsMatch}>
            {loading ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
      ) : null}

      {step === "success" ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
          Password reset successful. Please sign in with your new password.
        </div>
      ) : null}

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

      {message && !processingText ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="font-bold text-slate-900 dark:text-slate-100">Password must include:</p>
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

function StepIndicator({ step }: { step: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "email", label: "Email" },
    { id: "code", label: "Code" },
    { id: "password", label: "Password" }
  ];
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Password reset progress">
      {steps.map((item, index) => {
        const active = index <= currentIndex || step === "success";
        return (
          <div key={item.id} className={active ? "rounded-full bg-blue-600 px-3 py-2 text-center text-xs font-black text-white" : "rounded-full bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300"}>
            {item.label}
          </div>
        );
      })}
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

async function updateLocalDemoUserPassword(email: string, password: string) {
  const stored = JSON.parse(window.localStorage.getItem("skillpilot_demo_users") ?? "[]") as Array<Record<string, unknown>>;
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashDemoPassword(password);
  const next = stored.map((user) => {
    if (String(user.email ?? "").toLowerCase() !== normalized) {
      return user;
    }

    return {
      ...user,
      passwordHash,
      password: undefined,
      passwordUpdatedAt: new Date().toISOString()
    };
  });
  window.localStorage.setItem("skillpilot_demo_users", JSON.stringify(next));
}

async function hashDemoPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return `sha256:${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
