import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your trainer hub"
      description="Start with secure local auth and a ready-to-grow business workspace."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-semibold text-moss" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
