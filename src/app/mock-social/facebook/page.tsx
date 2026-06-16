import { MockSocialPlatformPage } from "@/components/trainer/mock-linkedin-page";

export default async function MockFacebookRoute({ searchParams }: { searchParams: Promise<{ postId?: string }> }) {
  const { postId } = await searchParams;

  return <MockSocialPlatformPage postId={postId ?? ""} platform="Facebook" />;
}
