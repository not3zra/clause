"use client";

import { useMemo, useState } from "react";

type MissionView = "landing" | "wizard" | "student" | "dashboard";
type Verdict = "idle" | "correct" | "revise" | "appeal";

// This prototype keeps its sample room data local until persistence and AI routes are introduced.
const stages = [
  {
    id: "surgery",
    label: "Stage 1",
    title: "Sentence Surgery",
    type: "AI graded correction",
    token: "CASE",
    prompt: "The team are reviewing the witness notes before lunch.",
    target: "Subject-verb agreement with collective nouns",
    accepted: "The team is reviewing the witness notes before lunch.",
    hint: "Find the verb that belongs to the singular collective noun team.",
  },
  {
    id: "sort",
    label: "Stage 2",
    title: "Evidence Sort",
    type: "Deterministic classification",
    token: "FILE",
    prompt: "Sort each evidence card by whether the subject and verb agree.",
    target: "Singular and plural subject checks",
    accepted: "4 / 4 evidence cards sorted",
    hint: "Look for the real subject before judging the verb.",
  },
  {
    id: "rewrite",
    label: "Stage 3",
    title: "Case File Rewrite",
    type: "AI graded rewrite",
    token: "OPEN",
    prompt:
      "Neither the map nor the notebook were in the drawer, but the clues was nearby.",
    target: "Compound subjects and nearby distractors",
    accepted:
      "Neither the map nor the notebook was in the drawer, but the clues were nearby.",
    hint: "When neither/nor joins singular nouns, the verb stays singular. Clues is plural.",
  },
];

const evidenceCards = [
  { sentence: "The clues are inside the blue folder.", answer: "Agrees" },
  { sentence: "A stack of reports are on the desk.", answer: "Needs revision" },
  { sentence: "Each witness has a numbered badge.", answer: "Agrees" },
  { sentence: "The detective and the clerk is checking prints.", answer: "Needs revision" },
];

const dashboardRows = [
  {
    name: "Aarav Mehta",
    status: "Escaped with hints",
    score: "82%",
    pattern: "Collective noun agreement",
    appeal: "None",
  },
  {
    name: "Mira Shah",
    status: "Provisional credit",
    score: "76%",
    pattern: "Nearby noun distractors",
    appeal: "1 awaiting review",
  },
  {
    name: "Kabir Rao",
    status: "Completed after guidance",
    score: "61%",
    pattern: "Neither/nor subjects",
    appeal: "Resolved",
  },
];

const topics = [
  "Subject-verb agreement",
  "Verb tense",
  "Parts of speech",
  "Punctuation and run-ons",
];

const themes = ["Detective Office", "Cursed Castle", "Sci-Fi Lab"];

export default function Home() {
  const [view, setView] = useState<MissionView>("landing");
  const [selectedTopic, setSelectedTopic] = useState(topics[0]);
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);
  const [studentAnswer, setStudentAnswer] = useState(stages[0].prompt);
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [hintLevel, setHintLevel] = useState(0);
  const [sortState, setSortState] = useState<Record<string, string>>({});

  // Only fully correct classifications count toward unlocking the final case file.
  const sortedCount = useMemo(
    () =>
      evidenceCards.filter((card) => sortState[card.sentence] === card.answer)
        .length,
    [sortState],
  );

  function checkAnswer() {
    const normalized = studentAnswer.toLowerCase().replace(/\s+/g, " ").trim();
    // Deterministic MVP grading: accept the required agreement repair despite extra sentence text.
    // A later server-side evaluator will replace this check with structured semantic feedback.
    if (normalized.includes("team is reviewing")) {
      setVerdict("correct");
      return;
    }

    setVerdict("revise");
    setHintLevel((level) => Math.min(level + 1, 2));
  }

  function challengeVerdict() {
    setVerdict("appeal");
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#211d19]">
      <div className="border-b border-[#d8ccb8] bg-[#fffaf0]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <button
            className="flex w-fit items-center gap-3 text-left"
            onClick={() => setView("landing")}
            type="button"
          >
            <span className="grid h-10 w-10 place-items-center rounded bg-[#23201d] text-sm font-black text-[#f7c948] shadow-sm">
              C
            </span>
            <span>
              <span className="block text-lg font-black tracking-[0.12em]">
                CLAUSE
              </span>
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#725f46]">
                Grammar missions
              </span>
            </span>
          </button>

          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <button
              className={navButton(view === "student")}
              onClick={() => setView("student")}
              type="button"
            >
              Try sample room
            </button>
            <button
              className={navButton(view === "wizard")}
              onClick={() => setView("wizard")}
              type="button"
            >
              Create room
            </button>
            <button
              className={navButton(view === "dashboard")}
              onClick={() => setView("dashboard")}
              type="button"
            >
              Demo dashboard
            </button>
          </div>
        </nav>
      </div>

      {view === "landing" && (
        <LandingView
          onCreate={() => setView("wizard")}
          onSample={() => setView("student")}
          onDashboard={() => setView("dashboard")}
        />
      )}

      {view === "wizard" && (
        <WizardView
          selectedTheme={selectedTheme}
          selectedTopic={selectedTopic}
          setSelectedTheme={setSelectedTheme}
          setSelectedTopic={setSelectedTopic}
          onPreview={() => setView("student")}
        />
      )}

      {view === "student" && (
        <StudentRoom
          challengeVerdict={challengeVerdict}
          checkAnswer={checkAnswer}
          hintLevel={hintLevel}
          setSortState={setSortState}
          setStudentAnswer={setStudentAnswer}
          sortState={sortState}
          sortedCount={sortedCount}
          studentAnswer={studentAnswer}
          verdict={verdict}
        />
      )}

      {view === "dashboard" && <DashboardView />}
    </main>
  );
}

function LandingView({
  onCreate,
  onDashboard,
  onSample,
}: {
  onCreate: () => void;
  onDashboard: () => void;
  onSample: () => void;
}) {
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-8 lg:py-14">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded border border-[#d8ccb8] bg-[#fffaf0] px-3 py-2 text-sm font-bold text-[#5b4a35]">
            <span className="h-2 w-2 rounded-full bg-[#1f8a70]" />
            OpenAI Build Week MVP
          </div>
          <div className="max-w-3xl space-y-5">
            <h1 className="text-5xl font-black leading-[1.02] text-[#171412] sm:text-6xl lg:text-7xl">
              Clause
            </h1>
            <p className="max-w-2xl text-xl leading-8 text-[#5a5147] sm:text-2xl">
              A browser-based grammar escape room where teachers generate,
              review, and assign short missions that grade grammar understanding
              instead of exact answer strings.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="primary-action" onClick={onSample} type="button">
              Try sample room
            </button>
            <button className="secondary-action" onClick={onCreate} type="button">
              Create a room
            </button>
            <button className="ghost-action" onClick={onDashboard} type="button">
              View dashboard
            </button>
          </div>
        </div>

        <div className="case-board min-h-[520px] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-[#c8b894] pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7c6746]">
                Detective Office
              </p>
              <h2 className="mt-1 text-2xl font-black">The Missing Verb File</h2>
            </div>
            <span className="rounded bg-[#f7c948] px-3 py-1 text-sm font-black">
              Grade 7
            </span>
          </div>

          <div className="grid gap-4">
            {stages.map((stage, index) => (
              <div
                className="rounded border border-[#cbb98f] bg-[#fffaf0] p-4 shadow-sm"
                key={stage.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#806a48]">
                      {stage.label}
                    </p>
                    <h3 className="mt-1 text-lg font-black">{stage.title}</h3>
                  </div>
                  <span className="rounded border border-[#d9c89c] bg-[#fdf6df] px-2 py-1 text-xs font-bold">
                    {stage.type}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5f554b]">{stage.prompt}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-[#eadfca]">
                    <div
                      className="h-2 rounded-full bg-[#1f8a70]"
                      style={{ width: `${(index + 1) * 28}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-[#1f6656]">
                    Token {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8ccb8] bg-[#fffaf0]">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:grid-cols-3 lg:px-8">
          <Metric label="Teacher review" value="Required" />
          <Metric label="Student data" value="Minimal" />
          <Metric label="AI behavior" value="Structured JSON" />
        </div>
      </section>
    </>
  );
}

function WizardView({
  onPreview,
  selectedTheme,
  selectedTopic,
  setSelectedTheme,
  setSelectedTopic,
}: {
  onPreview: () => void;
  selectedTheme: string;
  selectedTopic: string;
  setSelectedTheme: (theme: string) => void;
  setSelectedTopic: (topic: string) => void;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[320px_1fr] lg:px-8">
      <aside className="space-y-3">
        {[
          "Learning setup",
          "Theme",
          "Generate",
          "Review and validate",
          "Publish",
        ].map((step, index) => (
          <div className="rounded border border-[#d8ccb8] bg-[#fffaf0] p-4" key={step}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#806a48]">
              Step {index + 1}
            </p>
            <p className="mt-1 font-black">{step}</p>
          </div>
        ))}
      </aside>

      <div className="space-y-6">
        <section className="panel">
          <div className="flex flex-col gap-4 border-b border-[#d8ccb8] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Teacher wizard</p>
              <h2 className="mt-2 text-3xl font-black">Generate a grammar room</h2>
              <p className="mt-3 max-w-2xl text-[#62584e]">
                Teachers choose the curriculum target first, then review every AI
                draft before students ever see it.
              </p>
            </div>
            <button className="primary-action" onClick={onPreview} type="button">
              Preview student room
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Field label="Class">
              <select className="input-shell" defaultValue="7B Grammar Lab">
                <option>7B Grammar Lab</option>
                <option>6A Language Arts</option>
              </select>
            </Field>
            <Field label="Grade">
              <select className="input-shell" defaultValue="Grade 7">
                <option>Grade 6</option>
                <option>Grade 7</option>
                <option>Grade 8</option>
                <option>Grade 9</option>
              </select>
            </Field>
            <Field label="Topic">
              <div className="grid gap-2 sm:grid-cols-2">
                {topics.map((topic) => (
                  <button
                    className={choiceButton(selectedTopic === topic)}
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    type="button"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Theme">
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {themes.map((theme) => (
                  <button
                    className={choiceButton(selectedTheme === theme)}
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    type="button"
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="panel">
            <p className="eyebrow">Generated draft</p>
            <h3 className="mt-2 text-2xl font-black">The Missing Verb File</h3>
            <p className="mt-3 text-[#62584e]">
              Three evidence stages test subject-verb agreement with collective
              nouns, nearby distractors, and compound subjects.
            </p>
            <div className="mt-5 grid gap-3">
              {stages.map((stage) => (
                <div
                  className="rounded border border-[#d8ccb8] bg-[#fffaf0] p-4"
                  key={stage.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black">{stage.title}</p>
                      <p className="mt-1 text-sm text-[#62584e]">{stage.target}</p>
                    </div>
                    <span className="w-fit rounded bg-[#dff3ec] px-2 py-1 text-xs font-black text-[#11614f]">
                      Validated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel bg-[#27231f] text-[#fff7e4]">
            <p className="eyebrow text-[#f7c948]">Publish checks</p>
            <div className="mt-5 space-y-4 text-sm">
              {[
                "Grammar correctness",
                "Kid-safe content",
                "Answer-key integrity",
                "Story consistency",
                "Clue token validity",
              ].map((check) => (
                <div className="flex items-center gap-3" key={check}>
                  <span className="grid h-6 w-6 place-items-center rounded bg-[#1f8a70] text-xs font-black">
                    OK
                  </span>
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function StudentRoom({
  challengeVerdict,
  checkAnswer,
  hintLevel,
  setSortState,
  setStudentAnswer,
  sortState,
  sortedCount,
  studentAnswer,
  verdict,
}: {
  challengeVerdict: () => void;
  checkAnswer: () => void;
  hintLevel: number;
  setSortState: (state: Record<string, string>) => void;
  setStudentAnswer: (answer: string) => void;
  sortState: Record<string, string>;
  sortedCount: number;
  studentAnswer: string;
  verdict: Verdict;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px] lg:px-8">
      <div className="space-y-6">
        <div className="panel">
          <div className="flex flex-col gap-4 border-b border-[#d8ccb8] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Guest sample room</p>
              <h2 className="mt-2 text-3xl font-black">The Missing Verb File</h2>
              <p className="mt-2 text-[#62584e]">
                Recover three clue tokens, then unlock the detective cabinet.
              </p>
            </div>
            <div className="rounded border border-[#d8ccb8] bg-[#fffaf0] px-4 py-3 text-sm font-black">
              12:00 timer
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {stages.map((stage, index) => (
              <div className="rounded border border-[#d8ccb8] bg-[#fffaf0] p-4" key={stage.id}>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#806a48]">
                  {stage.label}
                </p>
                <p className="mt-1 font-black">{stage.title}</p>
                <p className="mt-3 text-sm text-[#62584e]">
                  Token: {index === 0 && verdict === "correct" ? stage.token : "Locked"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <section className="panel">
          <p className="eyebrow">Stage 1 | Sentence Surgery</p>
          <h3 className="mt-2 text-2xl font-black">Repair the witness note</h3>
          <p className="mt-3 text-[#62584e]">
            Correct the sentence so the verb agrees with the subject. The answer
            is checked for the target rule, not one exact string.
          </p>
          <textarea
            className="mt-5 min-h-32 w-full rounded border border-[#c8b894] bg-[#fffaf0] p-4 text-lg leading-8 outline-none ring-[#1f8a70] focus:ring-2"
            onChange={(event) => setStudentAnswer(event.target.value)}
            value={studentAnswer}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button className="primary-action" onClick={checkAnswer} type="button">
              Check answer
            </button>
            <button
              className="secondary-action"
              onClick={() => setStudentAnswer(stages[0].prompt)}
              type="button"
            >
              Reset to original
            </button>
          </div>

          {verdict !== "idle" && (
            <div className={feedbackClass(verdict)}>
              <p className="font-black">
                {verdict === "correct" && "Correct: clue token recovered."}
                {verdict === "revise" && "Needs revision: check the target rule."}
                {verdict === "appeal" && "Challenge submitted for teacher review."}
              </p>
              <p className="mt-2 text-sm leading-6">
                Checking: Does the verb agree with the singular collective noun
                team? {hintLevel > 0 ? stages[0].hint : ""}
              </p>
              {verdict === "revise" && (
                <button
                  className="mt-3 text-sm font-black underline"
                  onClick={challengeVerdict}
                  type="button"
                >
                  Challenge this result
                </button>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <p className="eyebrow">Stage 2 | Evidence Sort</p>
          <h3 className="mt-2 text-2xl font-black">Sort the evidence cards</h3>
          <div className="mt-5 grid gap-3">
            {evidenceCards.map((card) => (
              <div
                className="rounded border border-[#d8ccb8] bg-[#fffaf0] p-4"
                key={card.sentence}
              >
                <p className="font-semibold">{card.sentence}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Agrees", "Needs revision"].map((answer) => (
                    <button
                      className={choiceButton(sortState[card.sentence] === answer)}
                      key={answer}
                      onClick={() =>
                        setSortState({ ...sortState, [card.sentence]: answer })
                      }
                      type="button"
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-black text-[#1f6656]">
            {sortedCount} of {evidenceCards.length} cards sorted correctly
          </p>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="panel bg-[#27231f] text-[#fff7e4]">
          <p className="eyebrow text-[#f7c948]">Final lock</p>
          <h3 className="mt-2 text-2xl font-black">Cabinet code</h3>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {stages.map((stage, index) => (
              <div
                className="rounded border border-[#6e6252] bg-[#332e29] p-3 text-center font-black"
                key={stage.id}
              >
                {index === 0 && verdict === "correct" ? stage.token : "----"}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#e8dcc4]">
            Tokens unlock only after the full stage is solved. Incorrect order
            gives guidance without a score penalty.
          </p>
        </div>

        <div className="panel">
          <p className="eyebrow">Progress</p>
          <div className="mt-5 space-y-4">
            <Progress label="Sentence Surgery" value={verdict === "correct" ? 100 : 35} />
            <Progress label="Evidence Sort" value={sortedCount * 25} />
            <Progress label="Case File Rewrite" value={0} />
          </div>
        </div>
      </aside>
    </section>
  );
}

function DashboardView() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className="panel">
        <div className="flex flex-col gap-4 border-b border-[#d8ccb8] pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Read-only demo dashboard</p>
            <h2 className="mt-2 text-3xl font-black">7B Grammar Lab</h2>
            <p className="mt-2 text-[#62584e]">
              Active room: The Missing Verb File | Subject-verb agreement
            </p>
          </div>
          <button className="secondary-action" type="button">
            Generate class insight
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Completion" value="86%" />
          <Metric label="First attempt" value="68%" />
          <Metric label="Hints used" value="14" />
          <Metric label="Appeals" value="2" />
        </div>

        <div className="mt-6 overflow-x-auto rounded border border-[#d8ccb8]">
          <table className="w-full min-w-[760px] border-collapse bg-[#fffaf0] text-left text-sm">
            <thead className="bg-[#eadfca] text-xs uppercase tracking-[0.14em] text-[#725f46]">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Key pattern</th>
                <th className="px-4 py-3">Appeal</th>
              </tr>
            </thead>
            <tbody>
              {dashboardRows.map((row) => (
                <tr className="border-t border-[#d8ccb8]" key={row.name}>
                  <td className="px-4 py-4 font-black">{row.name}</td>
                  <td className="px-4 py-4">{row.status}</td>
                  <td className="px-4 py-4 font-black">{row.score}</td>
                  <td className="px-4 py-4">{row.pattern}</td>
                  <td className="px-4 py-4">{row.appeal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#4e4235]">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#d8ccb8] bg-[#fffaf0] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#806a48]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-sm font-black">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#eadfca]">
        <div
          className="h-2 rounded-full bg-[#1f8a70]"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function navButton(active: boolean) {
  return `rounded border px-3 py-2 transition ${
    active
      ? "border-[#23201d] bg-[#23201d] text-[#fff7e4]"
      : "border-[#d8ccb8] bg-[#fffaf0] text-[#352d24] hover:border-[#23201d]"
  }`;
}

function choiceButton(active: boolean) {
  return `rounded border px-3 py-2 text-left text-sm font-bold transition ${
    active
      ? "border-[#1f8a70] bg-[#dff3ec] text-[#104f43]"
      : "border-[#d8ccb8] bg-[#fffaf0] text-[#4e4235] hover:border-[#1f8a70]"
  }`;
}

function feedbackClass(verdict: Verdict) {
  const base = "mt-5 rounded border p-4";
  if (verdict === "correct") {
    return `${base} border-[#86bfae] bg-[#e4f6ef] text-[#104f43]`;
  }
  if (verdict === "appeal") {
    return `${base} border-[#c7b06d] bg-[#fff4c7] text-[#5f4b13]`;
  }
  return `${base} border-[#d79b83] bg-[#fff0e9] text-[#773a24]`;
}
