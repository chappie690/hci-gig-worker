import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Use the mock SkillPilot reset flow to verify your account and create a new secure password. No real email is sent."
      footer={
        <p>
          Remember your password?{" "}
          <Link className="font-semibold text-moss" href="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
