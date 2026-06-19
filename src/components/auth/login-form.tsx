"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password
      })
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Unable to sign in.");
      return;
    }

    const data = await response.json();
    router.push(data.redirectTo ?? "/learner/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Input label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input label="Password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <div className="-mt-2 text-right">
        <Link className="text-sm font-semibold text-moss transition hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:text-emerald-300 dark:hover:text-white" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
