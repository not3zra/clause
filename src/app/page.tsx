"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type View = "landing" | "wizard" | "missions" | "dashboard";
type Verdict = "idle" | "correct" | "revise" | "appeal";
type StageId = "surgery" | "sort" | "rewrite";

type Stage = {
  id: StageId;
  title: string;
  token: string;
  rule: string;
  prompt: string;
  hint: string;
};

const stages: Stage[] = [
  {
    id: "surgery",
    title: "Sentence Surgery",
    token: "CASE",
    rule: "Does the verb agree with the singular collective noun team?",
    prompt: "The team are reviewing the witness notes before lunch.",
    hint: "Team is a singular collective noun here, so its verb should be singular.",
  },
  {
    id: "sort",
    title: "Evidence Sort",
    token: "FILE",
    rule: "Find the real subject before deciding whether its verb agrees.",
    prompt: "Classify each sentence as agreeing or needing revision.",
    hint: "Ignore prepositional phrases and look for the noun doing the action.",
  },
  {
    id: "rewrite",
    title: "Case File Rewrite",
    token: "OPEN",
    rule: "Check each linked sentence for the subject that controls its verb.",
    prompt: "Repair both statements in the case file.",
    hint: "Neither/nor with singular nouns takes a singular verb; clues is plural.",
  },
];

const evidenceCards = [
  { sentence: "The clues are inside the blue folder.", answer: "Agrees" },
  { sentence: "A stack of reports are on the desk.", answer: "Needs revision" },
  { sentence: "Each witness has a numbered badge.", answer: "Agrees" },
  { sentence: "The detective and the clerk is checking prints.", answer: "Needs revision" },
];

const studentRows = [
  { name: "Aarav Mehta", roll: "7B-04", status: "Complete", score: "82%", time: "10:14", appeal: "None", mastery: "Secure", detail: "2 hints used. Strong on collective nouns." },
  { name: "Mira Shah", roll: "7B-12", status: "In progress", score: "76%", time: "08:52", appeal: "1 pending", mastery: "Developing", detail: "Appeal on the compound-subject item." },
  { name: "Kabir Rao", roll: "7B-19", status: "Complete", score: "61%", time: "13:08", appeal: "Resolved", mastery: "Needs practice", detail: "Needed final guidance on neither/nor agreement." },
];

const themes = [
  { name: "Detective Office", note: "Case files, evidence tags, and cabinet locks.", accent: "Recommended" },
  { name: "Cursed Castle", note: "Runes, sealed doors, and lost manuscripts.", accent: "" },
  { name: "Sci-Fi Lab", note: "Keycards, terminals, and system diagnostics.", accent: "" },
];

export default function Home() {
  // The MVP keeps navigation and room state local until auth and persistence exist.
  const [view, setView] = useState<View>("landing");
  const [wizardStep, setWizardStep] = useState(1);
  const [theme, setTheme] = useState(themes[0].name);

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-[#172235]">
      <Header onHome={() => setView("landing")} onTeacher={() => { setView("wizard"); setWizardStep(1); }} />
      {view === "landing" && <Landing onCreate={() => { setView("wizard"); setWizardStep(1); }} onSample={() => setView("missions")} />}
      {view === "wizard" && <TeacherWizard step={wizardStep} setStep={setWizardStep} theme={theme} setTheme={setTheme} onPreview={() => setView("missions")} />}
      {view === "missions" && <MissionPlayer theme={theme} onDashboard={() => setView("dashboard")} />}
      {view === "dashboard" && <Dashboard />}
    </main>
  );
}

function Header({ onHome, onTeacher }: { onHome: () => void; onTeacher: () => void }) {
  return <header className="border-b border-[#d8dee8] bg-white"><nav className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4">
    <button className="flex items-center gap-2.5 text-left" onClick={onHome} type="button"><span className="grid h-9 w-9 place-items-center rounded-md bg-[#142b4a] font-black text-[#f2b84b]">C</span><span><span className="block text-lg font-black tracking-[0.12em]">CLAUSE</span><span className="block text-xs font-semibold text-[#657286]">Grammar missions</span></span></button>
    <button className="text-sm font-bold text-[#1e4e85] underline-offset-4 hover:underline" onClick={onTeacher} type="button">Teacher sign in</button>
  </nav></header>;
}

function Landing({ onCreate, onSample }: { onCreate: () => void; onSample: () => void }) {
  return <>
    <section className="mx-auto max-w-[1080px] px-5 py-16 sm:py-24">
      <div className="max-w-2xl">
        <p className="eyebrow">Grammar escape rooms</p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">Grammar escape rooms your class actually finishes.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#536174]">Create short, reviewable grammar missions with clear student feedback and classroom-ready insight.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button className="primary-action flex-1" onClick={onSample} type="button">Try sample room</button><button className="primary-action flex-1" onClick={onCreate} type="button">Create a room</button></div>
      </div>
    </section>
    <section className="border-y border-[#d8dee8] bg-white"><div className="mx-auto grid max-w-[1080px] gap-0 px-5 sm:grid-cols-3">
      <Proof icon="01" title="Missions that move" text="Themes and locks give grammar practice a clear finish line." />
      <Proof icon="02" title="Feedback that teaches" text="Hints, retries, and appeals stay beside the work." />
      <Proof icon="03" title="Insight for teachers" text="Review generated content and see class patterns at a glance." />
    </div></section>
  </>;
}

function Proof({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="border-[#d8dee8] py-8 sm:border-r sm:px-7 sm:last:border-0 sm:first:pl-0"><span className="grid h-9 w-9 place-items-center rounded-md bg-[#e8f0fb] text-xs font-black text-[#1e4e85]">{icon}</span><h2 className="mt-4 text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-[#59677a]">{text}</p></div>;
}

function TeacherWizard({ step, setStep, theme, setTheme, onPreview }: { step: number; setStep: (step: number) => void; theme: string; setTheme: (theme: string) => void; onPreview: () => void }) {
  const [generated, setGenerated] = useState(false);
  const [selectedStage, setSelectedStage] = useState<StageId>("surgery");
  const [instruction, setInstruction] = useState("");
  const [adaptive, setAdaptive] = useState(false);
  const [marksVisible, setMarksVisible] = useState(false);
  const selected = stages.find((item) => item.id === selectedStage) ?? stages[0];
  const next = () => setStep(Math.min(5, step + 1));
  const previous = () => setStep(Math.max(1, step - 1));

  return <section className="mx-auto max-w-[1080px] px-5 py-8">
    <div className="mb-8 flex flex-wrap gap-2">{["Learning setup", "Theme", "Generate", "Review", "Publish"].map((label, index) => <button className={stepButton(step === index + 1, step > index + 1)} key={label} onClick={() => setStep(index + 1)} type="button"><span>{index + 1}</span>{label}</button>)}</div>
    <div className="panel">
      {step === 1 && <><PanelTitle eyebrow="Step 1" title="Learning setup" text="Set the class context before generating a room." /><div className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Class"><select className="input-shell" defaultValue="7B Grammar Lab"><option>7B Grammar Lab</option><option>6A Language Arts</option></select></Field><Field label="Grade"><select className="input-shell" defaultValue="Grade 7"><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option></select></Field><Field label="Topic"><select className="input-shell"><option>Subject-verb agreement</option><option>Verb tense</option><option>Parts of speech</option></select></Field><Field label="Subtopic"><select className="input-shell"><option>Collective and compound subjects</option><option>Nearby noun distractors</option></select></Field></div><Field label="Stage count"><div className="mt-2 flex gap-2"><button className="choice active" type="button">3 stages</button><button className="choice" type="button">4 stages</button></div></Field></>}
      {step === 2 && <><PanelTitle eyebrow="Step 2" title="Choose a theme" text="The shared mission components stay the same; only the tone and accents change." /><div className="mt-7 grid gap-4 md:grid-cols-3">{themes.map((item) => <button className={`theme-card ${theme === item.name ? "theme-selected" : ""}`} key={item.name} onClick={() => setTheme(item.name)} type="button"><span className="text-xs font-black text-[#1e4e85]">{item.accent || "Theme"}</span><span className="mt-2 block text-lg font-black">{item.name}</span><span className="mt-2 block text-sm leading-6 text-[#59677a]">{item.note}</span></button>)}</div></>}
      {step === 3 && <><PanelTitle eyebrow="Step 3" title="Generate room" text="The teacher remains in control of when a draft is created." /><Field label="Optional instruction"><textarea className="input-shell mt-2 min-h-28" maxLength={250} onChange={(event) => setInstruction(event.target.value)} placeholder="For example: include a cricket-club context." value={instruction} /><span className="mt-1 block text-right text-xs text-[#657286]">{instruction.length}/250</span></Field><label className="mt-5 flex items-start gap-3 rounded-md border border-[#d8dee8] p-4"><input checked={adaptive} className="mt-1 h-4 w-4" onChange={(event) => setAdaptive(event.target.checked)} type="checkbox" /><span><span className="block font-black">Adaptive Extra Case</span><span className="mt-1 block text-sm text-[#59677a]">Offer an optional extension after the final lock.</span></span></label><button className="primary-action mt-6" onClick={() => { setGenerated(true); setStep(4); }} type="button">{generated ? "Regenerate room" : "Generate room"}</button></>}
      {step === 4 && <div className="grid gap-6 lg:grid-cols-[280px_1fr]"><aside><p className="eyebrow">Step 4</p><h2 className="mt-2 text-2xl font-black">Review and validate</h2><div className="mt-5 space-y-2">{stages.map((item) => <button className={`stage-list ${selectedStage === item.id ? "stage-selected" : ""}`} key={item.id} onClick={() => setSelectedStage(item.id)} type="button"><span className="status-dot status-ok">OK</span><span><strong>{item.title}</strong><small>All checks passed</small></span></button>)}</div></aside><div className="rounded-md border border-[#d8dee8] p-5"><p className="eyebrow">Selected stage</p><h3 className="mt-2 text-xl font-black">{selected.title}</h3><Field label="Question text"><textarea className="input-shell mt-2 min-h-28" defaultValue={selected.prompt} /></Field><Field label="Clue token"><input className="input-shell mt-2" defaultValue={selected.token} /></Field><div className="mt-5 flex flex-wrap gap-2"><button className="secondary-action" type="button">Edit</button><button className="secondary-action" type="button">Regenerate</button><button className="secondary-action" onClick={onPreview} type="button">Test answer</button><button className="secondary-action" type="button">Duplicate room</button></div><div className="mt-6 rounded-md bg-[#eff8f3] p-4 text-sm text-[#245c45]"><strong>Validation checklist: </strong>grammar correctness, safety, grade fit, answer key, ambiguity, and story consistency are clear.</div></div></div>}
      {step === 5 && <><PanelTitle eyebrow="Step 5" title="Publish room" text="Confirm the review and choose how your class will enter the mission." /><label className="mt-6 flex gap-3 rounded-md border border-[#d8dee8] p-4"><input className="mt-1 h-4 w-4" type="checkbox" /><span><strong>I reviewed the generated content.</strong><span className="mt-1 block text-sm text-[#59677a]">Publishing is enabled after teacher review.</span></span></label><label className="mt-4 flex items-center justify-between rounded-md border border-[#d8dee8] p-4"><span><strong>Show marks to students</strong><span className="mt-1 block text-sm text-[#59677a]">Hidden by default.</span></span><input checked={marksVisible} onChange={(event) => setMarksVisible(event.target.checked)} type="checkbox" /></label><div className="mt-6 flex flex-wrap gap-3"><button className="primary-action" type="button">Copy home invite link</button><button className="secondary-action" type="button">Launch presentation mode</button></div></>}
      <div className="mt-8 flex justify-between border-t border-[#d8dee8] pt-5"><button className="ghost-action" disabled={step === 1} onClick={previous} type="button">Back</button>{step < 5 && <button className="primary-action" onClick={next} type="button">Continue</button>}</div>
    </div>
  </section>;
}

function MissionPlayer({ theme, onDashboard }: { theme: string; onDashboard: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [answer, setAnswer] = useState(stages[0].prompt);
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [attempts, setAttempts] = useState(0);
  const [sortState, setSortState] = useState<Record<string, string>>({});
  const [rewrite, setRewrite] = useState(["Neither the map nor the notebook were in the drawer.", "The clues was nearby."]);
  const [completed, setCompleted] = useState<StageId[]>([]);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [lockInput, setLockInput] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(720);
  const [success, setSuccess] = useState(false);
  // Evidence Sort is deterministic in the demo so the stage works without an AI service.
  const sortedCount = useMemo(() => evidenceCards.filter((card) => sortState[card.sentence] === card.answer).length, [sortState]);
  const current = stages[stageIndex];

  useEffect(() => { const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, []);
  const completeStage = (id: StageId) => { setCompleted((items) => items.includes(id) ? items : [...items, id]); setVerdict("correct"); };
  // Accept the target repair with surrounding text; semantic grading will replace this fallback.
  const checkSurgery = () => { if (answer.toLowerCase().replace(/\s+/g, " ").includes("team is reviewing")) completeStage("surgery"); else { setAttempts((count) => count + 1); setVerdict("revise"); } };
  const checkRewrite = () => { const normalized = rewrite.join(" ").toLowerCase(); if (normalized.includes("notebook was") && normalized.includes("clues were")) completeStage("rewrite"); else { setAttempts((count) => count + 1); setVerdict("revise"); } };
  const allComplete = completed.length === stages.length;
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (success) return <SuccessScreen onDashboard={onDashboard} />;
  if (allComplete && stageIndex === 2) return <FinalLock tokens={stages.map((item) => item.token)} lockInput={lockInput} setLockInput={setLockInput} onUnlock={() => setSuccess(true)} />;

  return <section className="mx-auto max-w-[1080px] px-5 py-7"><div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><span className="demo-badge">Demo classroom</span><h1 className="mt-2 text-2xl font-black">The Missing Verb File</h1><p className="mt-1 text-sm text-[#59677a]">{theme} | Recover three tokens to open the cabinet.</p></div><div className="timer">Time {time}</div></div><StageProgressRail active={stageIndex} completed={completed} />
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]"><section className="panel"><p className="eyebrow">Stage {stageIndex + 1} of 3</p><h2 className="mt-2 text-2xl font-black">{current.title}</h2><p className="mt-2 text-[#59677a]">{current.prompt}</p>
      {current.id === "surgery" && <><input aria-label="Correct the sentence" className="input-shell mt-6 text-base" onChange={(event) => setAnswer(event.target.value)} value={answer} /><div className="mt-3 flex items-center justify-between gap-3"><button className="primary-action" onClick={checkSurgery} type="button">Check answer</button><button className="text-sm font-bold text-[#1e4e85] hover:underline" onClick={() => setAnswer(stages[0].prompt)} type="button">Reset to original</button></div></>}
      {current.id === "sort" && <><p className="mt-5 text-sm font-bold text-[#1e4e85]">{sortedCount} of {evidenceCards.length} evidence cards correct</p><div className="mt-4 grid gap-3">{evidenceCards.map((card) => <div className="rounded-md border border-[#d8dee8] p-4" key={card.sentence}><p className="font-semibold">{card.sentence}</p><div className="mt-3 flex flex-wrap gap-2">{["Agrees", "Needs revision"].map((choice) => <button className={`choice ${sortState[card.sentence] === choice ? "active" : ""}`} key={choice} onClick={() => setSortState({ ...sortState, [card.sentence]: choice })} type="button">{choice}</button>)}</div></div>)}</div><button className="primary-action mt-5" disabled={sortedCount !== evidenceCards.length} onClick={() => completeStage("sort")} type="button">Submit evidence</button></>}
      {current.id === "rewrite" && <><div className="mt-5 space-y-3">{rewrite.map((sentence, index) => <input aria-label={`Rewrite sentence ${index + 1}`} className="input-shell" key={index} onChange={(event) => setRewrite(rewrite.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} value={sentence} />)}</div><button className="primary-action mt-5" onClick={checkRewrite} type="button">Submit case file</button></>}
      <FeedbackPanel appealOpen={appealOpen} appealSubmitted={appealSubmitted} attempts={attempts} onAppealOpen={() => setAppealOpen(true)} onAppealSubmit={() => { setAppealSubmitted(true); setAppealOpen(false); setVerdict("appeal"); }} rule={current.rule} verdict={verdict} />
      {verdict === "correct" && !allComplete && <button className="secondary-action mt-5" onClick={() => { setStageIndex(Math.min(2, stageIndex + 1)); setVerdict("idle"); }} type="button">Continue to next stage</button>}
    </section><aside className="space-y-4"><div className="panel"><p className="eyebrow">Clue tray</p><div className="mt-4 flex flex-wrap gap-2">{stages.map((item) => <span className={`token ${completed.includes(item.id) ? "token-ready" : ""}`} key={item.id}>{completed.includes(item.id) ? item.token : "Locked"}</span>)}</div></div><div className="rounded-md border border-[#bfd0e6] bg-[#edf5ff] p-4 text-sm leading-6 text-[#315b85]"><strong>Demo guide</strong><br />Try a wrong answer, challenge its result, then inspect the teacher insight.</div></aside></div>
  </section>;
}

function StageProgressRail({ active, completed }: { active: number; completed: StageId[] }) { return <div className="progress-rail">{stages.map((stage, index) => <div className="progress-step" key={stage.id}><span className={`marker ${completed.includes(stage.id) ? "done" : active === index ? "current" : ""}`}>{completed.includes(stage.id) ? "OK" : index + 1}</span><span><strong>{stage.title}</strong><small>{completed.includes(stage.id) ? stage.token : active === index ? "In progress" : "Locked"}</small></span>{index < stages.length - 1 && <i />}</div>)}</div>; }

function FeedbackPanel({ appealOpen, appealSubmitted, attempts, onAppealOpen, onAppealSubmit, rule, verdict }: { appealOpen: boolean; appealSubmitted: boolean; attempts: number; onAppealOpen: () => void; onAppealSubmit: () => void; rule: string; verdict: Verdict }) {
  if (verdict === "idle") return null;
  const label = verdict === "correct" ? "Correct" : verdict === "appeal" ? "Awaiting review" : "Needs revision";
  const hint = attempts > 1 ? "Final guidance: repair the agreement before submitting again." : "Hint: identify the subject before you change the verb.";
  return <div className={`feedback feedback-${verdict}`}><p className="text-sm"><strong>Checking:</strong> {rule}</p><p className="mt-3 font-black"><span className="status-icon">{verdict === "correct" ? "OK" : verdict === "appeal" ? "..." : "!"}</span>{label}</p>{verdict === "revise" && <p className="mt-3 text-sm leading-6">{hint}</p>}{appealSubmitted && <p className="mt-3 text-sm">Your note is awaiting teacher review. You can keep playing.</p>}{!appealOpen && verdict !== "appeal" && <button className="mt-4 text-sm font-bold text-[#1e4e85] underline" onClick={onAppealOpen} type="button">Challenge this result</button>}{appealOpen && <div className="mt-4 border-t border-current/20 pt-4"><label className="text-sm font-bold">Optional explanation<textarea className="input-shell mt-2 min-h-20 text-[#172235]" placeholder="Tell your teacher what you intended." /></label><button className="secondary-action mt-3" onClick={onAppealSubmit} type="button">Submit challenge</button></div>}</div>;
}

function FinalLock({ tokens, lockInput, setLockInput, onUnlock }: { tokens: string[]; lockInput: string[]; setLockInput: (tokens: string[]) => void; onUnlock: () => void }) { const rightOrder = lockInput.join(" ") === tokens.join(" "); return <section className="mx-auto max-w-xl px-5 py-14"><div className="panel text-center"><p className="eyebrow">Final lock</p><h1 className="mt-2 text-3xl font-black">Open the cabinet</h1><p className="mt-3 text-[#59677a]">Enter the recovered tokens in their stage order.</p><div className="mt-7 grid grid-cols-3 gap-3">{tokens.map((_, index) => <div className="lock-slot" key={index}>{lockInput[index] ?? ""}</div>)}</div><div className="mt-6 flex flex-wrap justify-center gap-2">{tokens.map((token) => <button className="choice" disabled={lockInput.includes(token)} key={token} onClick={() => setLockInput([...lockInput, token])} type="button">{token}</button>)}</div><div className="mt-5 flex justify-center gap-2"><button className="ghost-action" onClick={() => setLockInput([])} type="button">Clear</button><button className="primary-action" disabled={!rightOrder} onClick={onUnlock} type="button">Unlock cabinet</button></div>{lockInput.length === 3 && !rightOrder && <p className="mt-4 text-sm text-[#9a3f35]">That order does not open the lock. Try the stage sequence.</p>}</div></section>; }

function SuccessScreen({ onDashboard }: { onDashboard: () => void }) { return <section className="mx-auto max-w-xl px-5 py-16"><div className="panel text-center"><span className="grid mx-auto h-12 w-12 place-items-center rounded-full bg-[#e8f6ee] font-black text-[#1d704f]">OK</span><p className="eyebrow mt-5">Mission complete</p><h1 className="mt-2 text-3xl font-black">Case closed.</h1><p className="mt-3 text-[#59677a]">You recovered every token and opened the cabinet.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button className="primary-action" onClick={onDashboard} type="button">View results</button><button className="secondary-action" type="button">Back to My Missions</button><button className="ghost-action" type="button">Try Extra Case</button></div></div></section>; }

function Dashboard() { const [expanded, setExpanded] = useState<string | null>(null); const [insight, setInsight] = useState(false); const [appealsOnly, setAppealsOnly] = useState(false); const rows = appealsOnly ? studentRows.filter((row) => row.appeal !== "None") : studentRows; return <section className="mx-auto max-w-[1080px] px-5 py-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Class overview</p><h1 className="mt-2 text-2xl font-black">7B Grammar Lab</h1><p className="mt-1 text-sm text-[#59677a]">The Missing Verb File | Subject-verb agreement</p></div><div className="flex gap-2"><button className="secondary-action" onClick={() => setAppealsOnly(!appealsOnly)} type="button">{appealsOnly ? "Show all" : "2 appeals pending"}</button><button className="primary-action" onClick={() => setInsight(true)} type="button">Get class insight</button></div></div>{insight && <div className="mt-6 rounded-md border border-[#bfd0e6] bg-[#edf5ff] p-4 text-sm leading-6 text-[#315b85]"><strong>Class insight:</strong> Most students secure collective-noun agreement, while nearby distractors and neither/nor structures need a short reteach before the next mission.</div>}<div className="mt-6 grid gap-4 sm:grid-cols-4"><Metric label="Completion" value="86%" /><Metric label="First attempt" value="68%" /><Metric label="Hints used" value="14" /><Metric label="Appeals" value="2" /></div><div className="mt-6 overflow-hidden rounded-md border border-[#d8dee8] bg-white">{rows.map((row) => <div className="border-b border-[#d8dee8] last:border-0" key={row.name}><button className="grid w-full gap-3 px-4 py-4 text-left text-sm sm:grid-cols-[1.3fr_0.7fr_0.55fr_0.7fr_0.7fr]" onClick={() => setExpanded(expanded === row.name ? null : row.name)} type="button"><span><strong className="block">{row.name}</strong><small>{row.roll}</small></span><span>{row.status}</span><span className="font-black">{row.score}</span><span><span className="status-icon">{row.mastery === "Secure" ? "OK" : "!"}</span>{row.mastery}</span><span>{row.appeal}</span></button>{expanded === row.name && <div className="border-t border-[#d8dee8] bg-[#f8fafc] px-4 py-4 text-sm text-[#59677a]"><strong className="text-[#172235]">Attempt detail: </strong>{row.detail}<div className="mt-3 flex gap-2"><button className="secondary-action" type="button">Open item detail</button>{row.appeal !== "None" && <button className="secondary-action" type="button">Review appeal</button>}</div></div>}</div>)}</div></section>; }

function PanelTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-2xl font-black">{title}</h1><p className="mt-2 max-w-2xl text-[#59677a]">{text}</p></div>; }
function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="mt-5 block text-sm font-bold text-[#2c3a4e]"><span>{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-[#d8dee8] bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#657286]">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
function stepButton(active: boolean, complete: boolean) { return `step-button ${active ? "step-active" : ""} ${complete ? "step-complete" : ""}`; }
