"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPasswordRuleResults, isStrongPassword } from "@/lib/password-rules";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TRAINER" | "LEARNER">("TRAINER");
  const passwordResults = getPasswordRuleResults(password);
  const passwordReady = isStrongPassword(password);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordReady) {
      setError("Create a stronger password before continuing.");
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        password,
        role
      })
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Unable to create account.");
      return;
    }

    const data = await response.json();
    router.push(data.redirectTo ?? "/learner/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Input label="Full name" name="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      <Input label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input label="Password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="font-bold text-slate-900 dark:text-slate-100">Password must include:</p>
        <ul className="mt-2 grid gap-1">
          {passwordResults.map((rule) => (
            <li key={rule.id} className={rule.passed ? "flex items-center gap-2 text-emerald-700 dark:text-emerald-300" : "flex items-center gap-2 text-slate-600 dark:text-slate-300"}>
              <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs font-black">
                {rule.passed ? "✓" : "•"}
              </span>
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <label className="grid gap-2 text-sm font-medium text-ink dark:text-slate-100">
        <span>Role</span>
        <select
          className="min-h-11 rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-limewash dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950"
          name="role"
          required
          value={role}
          onChange={(event) => setRole(event.target.value as "TRAINER" | "LEARNER")}
        >
          <option value="TRAINER">Trainer</option>
          <option value="LEARNER">Learner</option>
        </select>
      </label>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
      <Button type="submit" disabled={loading || !passwordReady}>
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
