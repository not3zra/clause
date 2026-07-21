"use client";

import dynamic from "next/dynamic";

const StudentInvite = dynamic(
  () => import("./student-invite").then((module) => module.StudentInvite),
  {
    ssr: false,
    loading: () => <main className="mx-auto max-w-xl px-5 py-16"><div className="panel" role="status">Loading invite...</div></main>,
  },
);

export function StudentInviteLoader({ inviteToken }: { inviteToken: string }) {
  return <StudentInvite inviteToken={inviteToken} />;
}
