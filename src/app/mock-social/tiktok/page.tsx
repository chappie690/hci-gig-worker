import { MockSocialPlatformPage } from "@/components/trainer/mock-linkedin-page";

export default async function MockTikTokRoute({ searchParams }: { searchParams: Promise<{ postId?: string }> }) {
  const { postId } = await searchParams;

  return <MockSocialPlatformPage postId={postId ?? ""} platform="TikTok" />;
}
