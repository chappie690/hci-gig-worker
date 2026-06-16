import { redirect } from "next/navigation";
import { ReceiptViewer } from "@/components/learner/receipt-viewer";
import { RoleShell } from "@/components/layout/role-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function LearnerReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <RoleShell user={user} label="Learner workspace" title="Payment receipt" activeHref="/learner/discover">
      <ReceiptViewer receiptId={id} />
    </RoleShell>
  );
}
