import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { MockFinanceEmailViewer } from "@/components/payments/mock-finance-email-viewer";
import { getCurrentUser } from "@/lib/auth";

export default async function MockFinanceEmailPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TRAINER") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const emailId = params.id ?? "";

  return (
    <AppShell user={user} title="Mock Finance Email" subtitle="Payment Agent" activeHref="/trainer/payment-agent">
      <MockFinanceEmailViewer emailId={emailId} />
    </AppShell>
  );
}
