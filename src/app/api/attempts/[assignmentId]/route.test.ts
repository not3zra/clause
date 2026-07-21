import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  enrolmentMaybeSingle: vi.fn(),
  attemptMaybeSingle: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { GET } from "./route";

const assignmentId = "011471b2-241a-4c97-99ae-1c34b096a812";

describe("GET /api/attempts/[assignmentId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    process.env.SUPABASE_SECRET_KEY = "server-test-key";

    mocks.getUser.mockResolvedValue({ data: { user: { id: "student-1" } } });
    mocks.enrolmentMaybeSingle.mockResolvedValue({ data: { id: "enrolment-1" }, error: null });
    mocks.attemptMaybeSingle.mockResolvedValue({ data: { id: "attempt-1", current_stage: 0, recovered_tokens: [] }, error: null });
    const enrolmentQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.enrolmentMaybeSingle };
    enrolmentQuery.select.mockReturnValue(enrolmentQuery);
    enrolmentQuery.eq.mockReturnValue(enrolmentQuery);
    const attemptQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.attemptMaybeSingle };
    attemptQuery.select.mockReturnValue(attemptQuery);
    attemptQuery.eq.mockReturnValue(attemptQuery);
    mocks.createClient
      .mockReturnValueOnce({ auth: { getUser: mocks.getUser } })
      .mockReturnValueOnce({ from: vi.fn((table: string) => table === "student_assignments" ? enrolmentQuery : attemptQuery) });
  });

  it("returns only the signed-in student's attempt for the requested assignment", async () => {
    const response = await GET(
      new NextRequest(`https://clause-learn.vercel.app/api/attempts/${assignmentId}`, { headers: { Authorization: "Bearer student-token" } }),
      { params: Promise.resolve({ assignmentId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "attempt-1", current_stage: 0, recovered_tokens: [] });
    expect(mocks.enrolmentMaybeSingle).toHaveBeenCalledOnce();
    expect(mocks.attemptMaybeSingle).toHaveBeenCalledOnce();
  });
});
