import { MockSocialPlatformPage } from "@/components/trainer/mock-linkedin-page";

export default async function MockInstagramRoute({ searchParams }: { searchParams: Promise<{ postId?: string }> }) {
  const { postId } = await searchParams;

  return <MockSocialPlatformPage postId={postId ?? ""} platform="Instagram" />;
}
