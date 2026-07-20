"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { validateClassInput } from "../lib/classes";
import { createInvitePath, RoomInput, validateRoomInput } from "../lib/rooms";
import { scoreForProgress } from "../lib/mission";
import { RoomStage, validateRoomStages } from "../lib/room-stages";
import { teacherSignUpOutcome } from "../lib/teacher-auth";
import { summarizeAttempts } from "../lib/teacher-metrics";

type TeacherClass = { id: string; name: string; grade: number };
type Room = {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  reviewed_at: string | null;
  validated_at: string | null;
  versionId?: string;
};
type Assignment = { id?: string; invite_token: string; marks_visible: boolean };
type AttemptRow = {
  id: string;
  current_stage: number;
  completed_at: string | null;
  hints_used: number;
  stage_results: Record<
    string,
    { attempts?: number; correct?: boolean; guided?: boolean; verdict?: string }
  >;
  student_assignment: {
    student: { full_name: string; roll_number: string } | null;
  } | null;
};
type Appeal = {
  id: string;
  stage_id: string;
  status: string;
  student_explanation: string;
  teacher_comment: string;
  mission_attempt: {
    student_assignment: { student: { full_name: string } | null } | null;
  } | null;
};

const initialRoom: RoomInput = {
  classId: "",
  topic: "Subject-verb agreement",
  subtopic: "Singular and plural subjects",
  theme: "Detective Office",
  stageCount: 3,
  marksVisible: false,
};

export function TeacherPortal() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState(7);
  const [roomInput, setRoomInput] = useState<RoomInput>(initialRoom);
  const [room, setRoom] = useState<Room | null>(null);
  const [draftStages, setDraftStages] = useState<RoomStage[]>([]);
  const [regenerationInstructions, setRegenerationInstructions] = useState("");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);

  const loadClasses = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, grade")
        .order("created_at", { ascending: false });
      if (error) setMessage(error.message);
      else setClasses((data ?? []) as TeacherClass[]);
      setTeacherId(id);
    },
    [supabase],
  );

  const loadResults = useCallback(async () => {
    const [attemptResult, appealResult] = await Promise.all([
      supabase
        .from("mission_attempts")
        .select(
          "id, current_stage, completed_at, hints_used, stage_results, student_assignment:student_assignments!inner(student:student_profiles(full_name, roll_number))",
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("appeals")
        .select(
          "id, stage_id, status, student_explanation, teacher_comment, mission_attempt:mission_attempts!inner(student_assignment:student_assignments!inner(student:student_profiles(full_name)))",
        )
        .order("created_at", { ascending: false }),
    ]);
    if (attemptResult.error) setMessage(attemptResult.error.message);
    else setAttempts((attemptResult.data ?? []) as unknown as AttemptRow[]);
    if (appealResult.error) setMessage(appealResult.error.message);
    else setAppeals((appealResult.data ?? []) as unknown as Appeal[]);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void loadClasses(data.user.id);
        void loadResults();
      }
    });
  }, [supabase, loadClasses, loadResults]);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const result =
      mode === "sign-up"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "sign-up") {
      const outcome = teacherSignUpOutcome({
        userId: result.data.user?.id,
        hasSession: Boolean(result.data.session),
      });
      if (outcome.kind === "signed-in") await loadClasses(outcome.userId);
      else {
        setMode("sign-in");
        setMessage(outcome.message);
      }
    } else if (result.data.user) await loadClasses(result.data.user.id);
  };

  const createClass = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateClassInput({ name: className, grade });
    if (!result.ok || !teacherId) {
      setMessage(
        result.ok
          ? "Sign in to create a class."
          : Object.values(result.errors).join(" "),
      );
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("classes")
      .insert({ teacher_id: teacherId, ...result.value })
      .select("id, name, grade")
      .single();
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setClasses((items) => [data as TeacherClass, ...items]);
      setRoomInput((input) => ({ ...input, classId: data.id }));
      setClassName("");
      setMessage("Class created. You can now create a room.");
    }
  };

  const createDraft = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateRoomInput(roomInput);
    if (!result.ok || !teacherId) {
      setMessage(
        result.ok
          ? "Sign in to create a room."
          : Object.values(result.errors).join(" "),
      );
      return;
    }
    setBusy(true);
    const title = `${result.value.theme}: ${result.value.topic}`;
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        teacher_id: teacherId,
        class_id: result.value.classId,
        title,
        topic: result.value.topic,
        subtopic: result.value.subtopic,
        theme: result.value.theme,
        stage_count: result.value.stageCount,
      })
      .select("id, title, status, reviewed_at, validated_at")
      .single();
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    const { data: version, error: versionError } = await supabase
      .from("room_versions")
      .insert({ room_id: data.id, stage_count: result.value.stageCount })
      .select("id")
      .single();
    if (versionError || !version) {
      setMessage(versionError?.message ?? "Could not create the room version.");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const selectedClass = classes.find(
      (item) => item.id === result.value.classId,
    );
    const generated = await fetch("/api/rooms/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session.session
          ? { Authorization: `Bearer ${session.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        grade: selectedClass?.grade ?? 7,
        topic: result.value.topic,
        subtopic: result.value.subtopic,
        theme: result.value.theme,
        stageCount: result.value.stageCount,
      }),
    });
    const generatedPayload = (await generated.json()) as {
      draft?: { title: string; stages: RoomStage[] };
      error?: string;
      errors?: string[];
    };
    if (!generated.ok || !generatedPayload.draft) {
      setMessage(
        generatedPayload.errors?.join(" ") ??
          generatedPayload.error ??
          "Could not generate a safe room draft. Try again.",
      );
      return;
    }
    const stages = generatedPayload.draft.stages;
    await supabase
      .from("rooms")
      .update({ title: generatedPayload.draft.title })
      .eq("id", data.id);
    const { data: savedStages, error: stagesError } = await supabase
      .from("room_stages")
      .insert(
        stages.map((stage) => ({
          room_version_id: version.id,
          ordinal: stage.ordinal,
          title: stage.title,
          prompt: stage.prompt,
          rule: stage.rule,
          token: stage.token,
          item_type: stage.itemType,
          accepted_answers: stage.acceptedAnswers,
          rubric: stage.rubric,
          hints: stage.hints,
        })),
      )
      .select("id, ordinal");
    if (stagesError || !savedStages) {
      setMessage(stagesError?.message ?? "Could not save room stages.");
      return;
    }
    const items = stages
      .flatMap((stage) =>
        (stage.items ?? []).map((item, index) => ({
          room_stage_id: savedStages.find(
            (saved) => saved.ordinal === stage.ordinal,
          )?.id,
          ordinal: index + 1,
          prompt: item.prompt,
          accepted_answers: item.acceptedAnswers,
        })),
      )
      .filter((item) => item.room_stage_id);
    if (items.length) {
      const { error: itemsError } = await supabase
        .from("room_stage_items")
        .insert(items);
      if (itemsError) {
        setMessage(itemsError.message);
        return;
      }
    }
    setDraftStages(
      stages.map((stage) => ({
        ...stage,
        id: savedStages.find((saved) => saved.ordinal === stage.ordinal)?.id,
      })),
    );
    setRoom({
      ...(data as Room),
      title: generatedPayload.draft.title,
      versionId: version.id,
    });
    setAssignment(null);
    setMessage(
      "AI draft generated and validated. Review the content before validation.",
    );
  };

  const saveDraftEdits = async () => {
    if (!room?.versionId) return;
    const validation = validateRoomStages(draftStages, draftStages.length);
    if (!validation.ok) {
      setMessage(validation.errors.join(" "));
      return;
    }
    setBusy(true);
    const updates = await Promise.all(
      validation.value.map((stage) =>
        supabase
          .from("room_stages")
          .update({
            title: stage.title,
            prompt: stage.prompt,
            rule: stage.rule,
            token: stage.token,
            accepted_answers: stage.acceptedAnswers,
            rubric: stage.rubric,
            hints: stage.hints,
          })
          .eq("id", stage.id!),
      ),
    );
    const error = updates.find((item) => item.error)?.error;
    if (!error) {
      const { data, error: roomError } = await supabase
        .from("rooms")
        .update({ reviewed_at: null, validated_at: null })
        .eq("id", room.id)
        .select("id, title, status, reviewed_at, validated_at")
        .single();
      setBusy(false);
      if (roomError) setMessage(roomError.message);
      else {
        setRoom({ ...(data as Room), versionId: room.versionId });
        setMessage(
          "Draft edits saved. Review and validate the updated content before publishing.",
        );
      }
      return;
    }
    setBusy(false);
    setMessage(error.message);
  };

  const regenerateDraft = async () => {
    if (!room) return;
    setBusy(true);
    const { data: session } = await supabase.auth.getSession();
    const selectedClass = classes.find((item) => item.id === roomInput.classId);
    const response = await fetch("/api/rooms/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session.session
          ? { Authorization: `Bearer ${session.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        grade: selectedClass?.grade ?? 7,
        topic: roomInput.topic,
        subtopic: roomInput.subtopic,
        theme: roomInput.theme,
        stageCount: roomInput.stageCount,
        instructions: regenerationInstructions,
      }),
    });
    const payload = (await response.json()) as {
      draft?: { stages: RoomStage[] };
      error?: string;
      errors?: string[];
    };
    setBusy(false);
    if (!response.ok || !payload.draft) {
      setMessage(
        payload.errors?.join(" ") ??
          payload.error ??
          "Could not regenerate a safe draft. Try again.",
      );
      return;
    }
    setDraftStages(
      payload.draft.stages.map((stage) => ({
        ...stage,
        id: draftStages.find((item) => item.ordinal === stage.ordinal)?.id,
      })),
    );
    setMessage(
      "Replacement draft ready. Save and revalidate it before teacher review.",
    );
  };

  const reviewRoom = async () => {
    if (!room) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("rooms")
      .update({ reviewed_at: new Date().toISOString() })
      .eq("id", room.id)
      .select("id, title, status, reviewed_at, validated_at")
      .single();
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setRoom(data as Room);
      setMessage(
        "Teacher review recorded. Run validation to unlock publishing.",
      );
    }
  };

  const validateRoom = async () => {
    if (!room?.reviewed_at) {
      setMessage("Record your review before validating this room.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("rooms")
      .update({ validated_at: new Date().toISOString() })
      .eq("id", room.id)
      .select("id, title, status, reviewed_at, validated_at")
      .single();
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setRoom(data as Room);
      setMessage(
        "Validation passed: grammar, safety, answer-key, and clue checks are ready for publishing.",
      );
    }
  };

  const publishRoom = async () => {
    if (!room?.reviewed_at || !room.validated_at || !teacherId) {
      setMessage("Review and validation are required before publishing.");
      return;
    }
    setBusy(true);
    const published = await supabase
      .rpc("publish_room_version_with_invite", {
        p_room_id: room.id,
        p_marks_visible: roomInput.marksVisible,
      })
      .single();
    const roomResult = published.error
      ? { error: published.error }
      : await supabase
          .from("rooms")
          .select("id, title, status, reviewed_at, validated_at")
          .eq("id", room.id)
          .single();
    setBusy(false);
    if (roomResult.error) setMessage(roomResult.error.message);
    else {
      const frozen = published.data as {
        invite_token: string;
        marks_visible: boolean;
      };
      setRoom(roomResult.data as Room);
      const assignmentResult = await supabase.from("assignments").select("id").eq("room_id", room.id).single();
      setAssignment({
        id: assignmentResult.data?.id,
        invite_token: frozen.invite_token,
        marks_visible: frozen.marks_visible,
      });
      setMessage(
        "Room published. Its exact stage version is now frozen and ready to share.",
      );
    }
  };

  const copyInvite = async () => {
    if (!assignment) return;
    const url = `${window.location.origin}${createInvitePath(assignment.invite_token)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invite link copied. It is scoped to this published room.");
    } catch {
      setMessage(`Copy this room-specific invite link: ${url}`);
    }
  };

  const closeInvite = async () => {
    if (!assignment?.id) return;
    setBusy(true);
    const { error } = await supabase.rpc("close_assignment_invite", { p_assignment_id: assignment.id });
    setBusy(false);
    if (error) setMessage(error.message);
    else setMessage("Invite closed. New joins and active student sessions are revoked; recorded progress remains available.");
  };

  const resolveAppeal = async (
    appeal: Appeal,
    status: "accepted" | "denied" | "overridden",
    teacherComment: string,
  ) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("resolve_appeal", {
      p_appeal_id: appeal.id,
      p_decision: status,
      p_teacher_comment: teacherComment.trim(),
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setAppeals((items) =>
        items.map((item) =>
          item.id === appeal.id ? { ...item, ...(data as unknown as Appeal) } : item,
        ),
      );
      setMessage(`Appeal ${status}.`);
    }
  };

  if (!teacherId)
    return (
      <section className="mx-auto max-w-md px-5 py-12">
        <div className="panel">
          <p className="eyebrow">Teacher access</p>
          <h1 className="mt-2 text-3xl font-black">
            {mode === "sign-in" ? "Sign in" : "Create teacher account"}
          </h1>
          <form className="mt-6 space-y-4" onSubmit={submitAuth}>
            {mode === "sign-up" && (
              <label className="block text-sm font-bold">
                Name
                <input
                  className="input-shell mt-2"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </label>
            )}
            <label className="block text-sm font-bold">
              Email
              <input
                className="input-shell mt-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-bold">
              Password
              <input
                className="input-shell mt-2"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button
              className="primary-action w-full"
              disabled={busy}
              type="submit"
            >
              {busy
                ? "Workingâ€¦"
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          <button
            className="ghost-action mt-4"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            type="button"
          >
            {mode === "sign-in"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
          {message && (
            <p className="mt-4 text-sm text-[#8b352a]" role="status">
              {message}
            </p>
          )}
        </div>
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <div className="panel">
        <p className="eyebrow">Your classes</p>
        <h1 className="mt-2 text-3xl font-black">
          Create and publish a grammar room
        </h1>
        <form className="mt-6 flex flex-wrap gap-3" onSubmit={createClass}>
          <input
            aria-label="Class name"
            className="input-shell flex-1"
            placeholder="e.g. 7B Grammar Lab"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <select
            aria-label="Grade"
            className="input-shell w-32"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
          >
            {[6, 7, 8, 9].map((value) => (
              <option key={value} value={value}>
                Grade {value}
              </option>
            ))}
          </select>
          <button className="secondary-action" disabled={busy} type="submit">
            Create class
          </button>
        </form>
        <ul className="mt-5 space-y-2">
          {classes.map((item) => (
            <li
              className="rounded-md border border-[#e8e2d7] p-3"
              key={item.id}
            >
              <strong>{item.name}</strong>
              <span className="ml-2 text-sm text-[#657286]">
                Grade {item.grade}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel mt-6">
        <p className="eyebrow">Room workflow</p>
        <h2 className="mt-2 text-2xl font-black">
          {room ? room.title : "New grammar room"}
        </h2>
        {!room ? (
          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={createDraft}
          >
            <label className="text-sm font-bold">
              Class
              <select
                aria-label="Room class"
                className="input-shell mt-2"
                value={roomInput.classId}
                onChange={(e) =>
                  setRoomInput({ ...roomInput, classId: e.target.value })
                }
              >
                <option value="">Choose a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Grade {item.grade})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              Theme
              <select
                aria-label="Theme"
                className="input-shell mt-2"
                value={roomInput.theme}
                onChange={(e) =>
                  setRoomInput({ ...roomInput, theme: e.target.value })
                }
              >
                {["Detective Office", "Cursed Castle", "Sci-Fi Lab"].map(
                  (theme) => (
                    <option key={theme}>{theme}</option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm font-bold">
              Topic
              <input
                aria-label="Grammar topic"
                className="input-shell mt-2"
                value={roomInput.topic}
                onChange={(e) =>
                  setRoomInput({ ...roomInput, topic: e.target.value })
                }
              />
            </label>
            <label className="text-sm font-bold">
              Subtopic
              <input
                aria-label="Grammar subtopic"
                className="input-shell mt-2"
                value={roomInput.subtopic}
                onChange={(e) =>
                  setRoomInput({ ...roomInput, subtopic: e.target.value })
                }
              />
            </label>
            <label className="text-sm font-bold">
              Stages
              <select
                aria-label="Stages"
                className="input-shell mt-2"
                value={roomInput.stageCount}
                onChange={(e) =>
                  setRoomInput({
                    ...roomInput,
                    stageCount: Number(e.target.value),
                  })
                }
              >
                <option value={3}>3 stages</option>
                <option value={4}>4 stages</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input
                checked={roomInput.marksVisible}
                onChange={(e) =>
                  setRoomInput({ ...roomInput, marksVisible: e.target.checked })
                }
                type="checkbox"
              />
              Show marks to students
            </label>
            <button
              className="primary-action w-fit"
              disabled={busy || !classes.length}
              type="submit"
            >
              Generate AI draft
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            {room.status === "draft" && (
              <div className="space-y-3 rounded-md border border-[#e8e2d7] p-4">
                <strong>Teacher draft editor</strong>
                {draftStages.map((stage, index) => (
                  <div
                    className="grid gap-2 border-t pt-3"
                    key={stage.id ?? stage.ordinal}
                  >
                    <label className="text-sm font-bold">
                      Stage {stage.ordinal} title
                      <input
                        className="input-shell mt-1"
                        value={stage.title}
                        onChange={(e) =>
                          setDraftStages((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, title: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="text-sm font-bold">
                      Prompt
                      <textarea
                        className="input-shell mt-1 min-h-20"
                        value={stage.prompt}
                        onChange={(e) =>
                          setDraftStages((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, prompt: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="text-sm font-bold">
                      Token
                      <input
                        className="input-shell mt-1"
                        value={stage.token}
                        onChange={(e) =>
                          setDraftStages((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, token: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
                <label className="block text-sm font-bold">
                  Regenerate instructions
                  <textarea
                    className="input-shell mt-1 min-h-20"
                    maxLength={500}
                    onChange={(event) => setRegenerationInstructions(event.target.value)}
                    placeholder="For example: use a cricket-club setting and simpler vocabulary."
                    value={regenerationInstructions}
                  />
                </label>
                <p className="text-xs text-[#667085]">
                  The replacement remains a draft until you save, revalidate, and review it.
                </p>
                <div className="flex flex-wrap gap-2">
                <button
                  className="secondary-action"
                  disabled={busy}
                  onClick={saveDraftEdits}
                  type="button"
                >
                  Save and revalidate edits
                </button>
                  <button className="ghost-action" disabled={busy} onClick={regenerateDraft} type="button">
                    Regenerate draft
                  </button>
                </div>
              </div>
            )}
            <div className="rounded-md border border-[#e8e2d7] p-4 text-sm">
              <strong>Review checklist</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#667085]">
                <li>Grammar rule and answer key are correct.</li>
                <li>Content is suitable for the selected grade.</li>
                <li>Story and clue tokens are consistent and kid-safe.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="secondary-action"
                disabled={busy || Boolean(room.reviewed_at)}
                onClick={reviewRoom}
                type="button"
              >
                {room.reviewed_at
                  ? "Review recorded"
                  : "Confirm teacher review"}
              </button>
              <button
                className="secondary-action"
                disabled={
                  busy || !room.reviewed_at || Boolean(room.validated_at)
                }
                onClick={validateRoom}
                type="button"
              >
                {room.validated_at ? "Validation passed" : "Validate room"}
              </button>
              <button
                className="primary-action"
                disabled={
                  busy || room.status === "published" || !room.validated_at
                }
                onClick={publishRoom}
                type="button"
              >
                {room.status === "published" ? "Published" : "Publish room"}
              </button>
              {assignment && (
                <>
                  <button className="primary-action" onClick={copyInvite} type="button">Copy home invite link</button>
                  <button className="ghost-action" disabled={busy || !assignment.id} onClick={closeInvite} type="button">Close invite</button>
                </>
              )}
            </div>
            {assignment && (
              <p className="text-sm text-[#667085]">
                Student marks are{" "}
                {assignment.marks_visible ? "visible" : "hidden"} for this
                assignment.
              </p>
            )}
          </div>
        )}
        {message && (
          <p className="mt-5 text-sm text-[#0f766e]" role="status">
            {message}
          </p>
        )}
      </div>
      <TeacherResults
        appeals={appeals}
        attempts={attempts}
        busy={busy}
        onRefresh={loadResults}
        onResolve={resolveAppeal}
      />
    </section>
  );
}

function TeacherResults({
  appeals,
  attempts,
  busy,
  onRefresh,
  onResolve,
}: {
  appeals: Appeal[];
  attempts: AttemptRow[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  onResolve: (
    appeal: Appeal,
    status: "accepted" | "denied" | "overridden",
    teacherComment: string,
  ) => Promise<void>;
}) {
  const [comments, setComments] = useState<Record<string, string>>({});
  const summary = summarizeAttempts(
    attempts.map((item) => ({
      currentStage: item.current_stage,
      completed: Boolean(item.completed_at),
      hintsUsed: item.hints_used,
      stageResults: item.stage_results ?? {},
    })),
  );
  return (
    <div className="panel mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Class overview</p>
          <h2 className="mt-2 text-2xl font-black">Student results</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Completion {summary.completion}% · First attempt{" "}
            {summary.firstAttemptAccuracy}% · Hints {summary.hintsUsed} ·{" "}
            {summary.mastery}
          </p>
        </div>
        <button
          className="secondary-action"
          disabled={busy}
          onClick={() => void onRefresh()}
          type="button"
        >
          Refresh results
        </button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-[#e8e2d7] text-xs uppercase text-[#657286]">
            <tr>
              <th className="pb-3">Student</th>
              <th className="pb-3">Progress</th>
              <th className="pb-3">Score</th>
              <th className="pb-3">Hints</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((item) => (
              <tr className="border-b border-[#f7f3eb]" key={item.id}>
                <td className="py-3 font-bold">
                  {item.student_assignment?.student?.full_name ?? "Student"}
                  <span className="ml-2 text-xs font-normal text-[#657286]">
                    {item.student_assignment?.student?.roll_number}
                  </span>
                </td>
                <td className="py-3">{item.current_stage}/3 stages</td>
                <td className="py-3 font-bold">
                  {scoreForProgress(
                    item.current_stage,
                    Boolean(item.completed_at),
                  )}
                  %
                </td>
                <td className="py-3">{item.hints_used}</td>
                <td className="py-3">
                  {item.completed_at ? "Complete" : "In progress"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-7 border-t border-[#e8e2d7] pt-5">
        <p className="eyebrow">Appeals</p>
        <h3 className="mt-2 text-lg font-black">
          {appeals.filter((item) => item.status === "pending").length} pending
          review
        </h3>
        <div className="mt-4 space-y-3">
          {appeals.map((appeal) => (
            <div
              className="rounded-md border border-[#e8e2d7] p-4"
              key={appeal.id}
            >
              <p className="font-bold">
                {appeal.mission_attempt?.student_assignment?.student
                  ?.full_name ?? "Student"}{" "}
                | {appeal.stage_id}
              </p>
              <p className="mt-2 text-sm text-[#667085]">
                {appeal.student_explanation || "No explanation provided."}
              </p>
              <p className="mt-2 text-xs font-bold uppercase text-[#657286]">
                {appeal.status}
              </p>
              {appeal.status === "pending" && (
                <>
                  <label className="mt-3 block text-sm font-bold">
                    Teacher comment
                    <textarea
                      className="input-shell mt-2 min-h-20"
                      onChange={(event) =>
                        setComments({
                          ...comments,
                          [appeal.id]: event.target.value,
                        })
                      }
                      value={comments[appeal.id] ?? ""}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="secondary-action"
                      disabled={busy}
                      onClick={() =>
                        void onResolve(
                          appeal,
                          "accepted",
                          comments[appeal.id] ?? "",
                        )
                      }
                      type="button"
                    >
                      Accept
                    </button>
                    <button
                      className="secondary-action"
                      disabled={busy}
                      onClick={() =>
                        void onResolve(
                          appeal,
                          "denied",
                          comments[appeal.id] ?? "",
                        )
                      }
                      type="button"
                    >
                      Deny
                    </button>
                    <button
                      className="secondary-action"
                      disabled={busy}
                      onClick={() =>
                        void onResolve(
                          appeal,
                          "overridden",
                          comments[appeal.id] ?? "",
                        )
                      }
                      type="button"
                    >
                      Override
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
