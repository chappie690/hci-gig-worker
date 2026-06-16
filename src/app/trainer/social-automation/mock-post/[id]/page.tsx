import { redirect } from "next/navigation";
import { MockSocialPost } from "@/components/trainer/mock-social-post";
import { getCurrentUser } from "@/lib/auth";

export default async function MockSocialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  return <MockSocialPost postId={id} />;
}
