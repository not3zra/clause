export function teacherSignUpRequest({ email, password, displayName }: { email: string; password: string; displayName: string }, origin: string) {
  return {
    email,
    password,
    options: {
      data: { display_name: displayName, account_type: "teacher" },
      emailRedirectTo: new URL("/", origin).toString(),
    },
  };
}
