import { redirect } from "next/navigation";
import { MockLinkedInPage } from "@/components/trainer/mock-linkedin-page";
import { getCurrentUser } from "@/lib/auth";

export default async function MockLinkedInRoute({ searchParams }: { searchParams: Promise<{ postId?: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { postId } = await searchParams;

  return <MockLinkedInPage postId={postId ?? ""} />;
}
