import { StudentInvite } from "@/components/student-invite";

export default async function JoinRoomPage({ params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  return <StudentInvite inviteToken={inviteToken} />;
}
