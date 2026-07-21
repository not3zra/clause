export function teacherSessionView(sessionResolved: boolean, teacherId: string | null) {
  if (!sessionResolved) return "loading";
  return teacherId ? "signed_in" : "signed_out";
}
