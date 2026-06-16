import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage your courses, learners, sessions, and payment agent."
      footer={
        <p>
          New to SkillPilot?{" "}
          <Link className="font-semibold text-moss" href="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
