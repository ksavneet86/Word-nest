import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { InviteAccept } from "@/components/InviteAccept";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/invites/${token}`)}`);
  return <InviteAccept token={token} />;
}
