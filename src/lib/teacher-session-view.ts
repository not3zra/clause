export function teacherSessionView(sessionResolved: boolean, teacherId: string | null) {
  if (!sessionResolved) return "loading";
  return teacherId ? "signed_in" : "signed_out";
}

export function teacherSessionAction(event: string, hasUser: boolean) {
  if (event === "SIGNED_OUT") return "clear";
  return hasUser ? "restore" : "ignore";
}
