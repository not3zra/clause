import { StudentInviteLoader } from "@/components/student-invite-loader";

export default async function JoinRoomPage({ params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  return <StudentInviteLoader inviteToken={inviteToken} />;
}
