"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChartBar, Moon, Palette, Sun, Target, Zap } from "lucide-react";
import { TeacherPortal } from "../components/teacher-portal";

type View = "landing" | "wizard" | "missions" | "dashboard" | "teacher";
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
  { name: "Detective Office", note: "Case files, evidence tags, and cabinet locks.", accent: "Recommended", cssClass: "detective", icon: "🕵️" },
  { name: "Cursed Castle", note: "Runes, sealed doors, and lost manuscripts.", accent: "", cssClass: "castle", icon: "🏰" },
  { name: "Sci-Fi Lab", note: "Keycards, terminals, and system diagnostics.", accent: "", cssClass: "scifi", icon: "🚀" },
];

export default function Home() {
  // The MVP keeps navigation and room state local until auth and persistence exist.
  const [view, setView] = useState<View>("landing");
  const [wizardStep, setWizardStep] = useState(1);
  const [theme, setTheme] = useState(themes[0].name);
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode((v) => !v);

  useEffect(() => {
    document.documentElement.classList.toggle("app-dark", darkMode);
  }, [darkMode]);

  return (
    <main className="min-h-screen">
      <Header darkMode={darkMode} onHome={() => setView("landing")} onTeacher={() => setView("teacher")} onToggleTheme={toggleDarkMode} />
      {view === "landing" && <Landing onCreate={() => setView("teacher")} onSample={() => setView("missions")} />}
      {view === "teacher" && <TeacherPortal />}
      {view === "wizard" && <TeacherWizard step={wizardStep} setStep={setWizardStep} theme={theme} setTheme={setTheme} onPreview={() => setView("missions")} />}
      {view === "missions" && <MissionPlayer theme={theme} onDashboard={() => setView("dashboard")} />}
      {view === "dashboard" && <Dashboard />}
    </main>
  );
}

function Header({ darkMode, onHome, onTeacher, onToggleTheme, themeClass }: { darkMode: boolean; onHome: () => void; onTeacher: () => void; onToggleTheme: () => void; themeClass?: string }) {
  return <><header className={`site-header${themeClass ? ` theme-${themeClass}` : ""}`}><div className="site-header-inner">
    <button className="site-logo" onClick={onHome} type="button"><span className="site-logo-mark">C</span><span className="site-logo-text"><strong>CLAUSE</strong><small>Grammar missions</small></span></button>
    <nav className="site-nav"><button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} type="button">How it works</button><button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} type="button">Features</button><button onClick={onTeacher} type="button">For teachers</button><button onClick={() => document.getElementById("sample-room")?.scrollIntoView({ behavior: "smooth" })} type="button">Sample room</button></nav>
    <div className="site-actions"><button aria-label={darkMode ? "Use light mode" : "Use dark mode"} className="theme-btn" onClick={onToggleTheme} title={darkMode ? "Use light mode" : "Use dark mode"} type="button">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button><button className="btn btn-ghost btn-sm" onClick={onTeacher} type="button">Sign in</button><button className="btn btn-primary btn-sm" onClick={onTeacher} type="button">Create a room</button></div>
  </div></header><nav className="mobile-nav"><button onClick={onHome} type="button">Home</button><button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} type="button">How it works</button><button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} type="button">Features</button><button onClick={onTeacher} type="button">For teachers</button><button onClick={() => document.getElementById("sample-room")?.scrollIntoView({ behavior: "smooth" })} type="button">Sample room</button><button onClick={onToggleTheme} type="button">{darkMode ? <Sun size={14} /> : <Moon size={14} />}</button></nav></>;
}

function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("a-revealed"); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function useMouseParallax(sectionId: string) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const mouse = { x: 0.5, y: 0.5 };
    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top) / r.height;
    };
    const shapesContainer = section.querySelector<HTMLElement>(".hero-floating-shapes");
    const glow = section.querySelector<HTMLElement>(".hero-mouse-glow");
    let rafId: number;
    const tick = () => {
      const dx = mouse.x - 0.5;
      const dy = mouse.y - 0.5;
      if (shapesContainer) {
        shapesContainer.style.transform = `translate(${dx * 20}px, ${dy * 20}px)`;
      }
      if (glow) {
        glow.style.transform = `translate(${mouse.x * 100}%, ${mouse.y * 100}%)`;
        glow.style.left = "0";
        glow.style.top = "0";
      }
      rafId = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafId); };
  }, [sectionId]);
}

function useCardTilt() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      document.querySelectorAll<HTMLElement>(".feature-card[data-tilt]").forEach((card) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rotateX = (0.5 - y) * 10;
        const rotateY = (x - 0.5) * 10;
        (card.querySelector(".card-tilt-layer") as HTMLElement).style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    };
    const onLeave = () => {
      document.querySelectorAll<HTMLElement>(".feature-card[data-tilt] .card-tilt-layer").forEach((el) => { el.style.transform = ""; });
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave, { passive: true });
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onLeave); };
  }, []);
}

function Landing({ onCreate, onSample }: { onCreate: () => void; onSample: () => void }) {
  useScrollReveal();
  return <>
    <section className="hero" id="sample-room">
      <div className="hero-grid" />
      <div className="hero-floating-shapes">
        <div className="hero-shape s1" />
        <div className="hero-shape s2" />
        <div className="hero-shape s3" />
        <div className="hero-shape s4" />
      </div>
      <div className="hero-inner">
        <h1>Turn grammar practice into an <em>adventure.</em></h1>
        <p>Create teacher-reviewed grammar rooms in minutes. Students solve, reflect, and build confidence while you see exactly where to help next.</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onCreate} type="button">Create a room <span aria-hidden="true">&rarr;</span></button>
          <button className="btn btn-secondary" onClick={onSample} type="button">Try sample room</button>
        </div>
      </div>
    </section>
    <section className="features" id="features">
      <div className="features-inner" data-reveal>
        <div className="features-header">
          <span className="features-label">Features</span>
          <h2>Everything you need to teach grammar <em>effectively.</em></h2>
          <p>From AI generation to real-time insights — built for teachers who want results.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card c1" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><Palette /></div><h3>AI-generated rooms</h3><p>Custom grammar puzzles tailored to your class, ready for teacher review before publishing.</p><div className="feature-card-accent" /></div></div>
          <div className="feature-card c2" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><Zap /></div><h3>Engaging gameplay</h3><p>Short, story-led challenges with immediate feedback that keep students motivated.</p><div className="feature-card-accent" /></div></div>
          <div className="feature-card c3" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><ChartBar /></div><h3>Real insights</h3><p>Spot progress, misconceptions, hints used, and appeals — see exactly who needs help.</p><div className="feature-card-accent" /></div></div>
          <div className="feature-card c4" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><Target /></div><h3>Teacher friendly</h3><p>Create, assign, and review in minutes with zero setup or training required.</p><div className="feature-card-accent" /></div></div>
        </div>
      </div>
    </section>
    <section className="steps" id="how-it-works">
      <div className="steps-inner" data-reveal>
        <div className="steps-header">
          <span className="steps-label">How it works</span>
          <h2>Create. Assign. Watch them <em>excel.</em></h2>
          <p>A focused grammar room goes from learning goal to useful classroom insight in four clear steps.</p>
        </div>
        <div className="steps-timeline">
          <div className="step-card" data-reveal><div className="step-num"><span>01</span></div><div className="step-body"><h3>Choose a focus</h3><p>Select the grade, grammar skill, and a theme for the room.</p></div></div>
          <div className="step-card" data-reveal><div className="step-num"><span>02</span></div><div className="step-body"><h3>Generate a room</h3><p>Clause prepares a draft with puzzles, clues, and answer support.</p></div></div>
          <div className="step-card" data-reveal><div className="step-num"><span>03</span></div><div className="step-body"><h3>Students play</h3><p>They solve, learn from feedback, and complete the final lock.</p></div></div>
          <div className="step-card" data-reveal><div className="step-num"><span>04</span></div><div className="step-body"><h3>Get insight</h3><p>Which skills are secure and where your class needs help.</p></div></div>
        </div>
      </div>
    </section>
    <section className="cta-banner">
      <div className="cta-banner-bg" />
      <div className="cta-banner-bg-shapes">
        <div className="cta-shape cs1" />
        <div className="cta-shape cs2" />
        <div className="cta-shape cs3" />
      </div>
      <div className="cta-banner-inner" data-reveal>
        <div className="cta-banner-content">
          <h2>Ready to transform grammar practice?</h2>
          <p>Start building your first grammar escape room in minutes. No credit card required.</p>
          <div className="cta-actions">
            <button className="btn btn-primary btn-glow" onClick={onCreate} type="button">Get started free <span aria-hidden="true">&rarr;</span></button>
            <button className="btn btn-secondary btn-glass" onClick={onSample} type="button">See how it works</button>
          </div>
        </div>
      </div>
    </section>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><span className="footer-brand-mark">C</span><span className="footer-brand-text"><strong>CLAUSE</strong><small>Grammar missions</small></span></div><nav className="footer-nav"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#sample-room">Try a room</a><button className="btn-ghost btn-sm" onClick={onCreate} type="button">For teachers</button></nav><span className="footer-copy">&copy; 2026 Clause. Grammar, made visible.</span></div></footer>
  </>;
}

function Proof({ kind, title, text }: { kind: "generate" | "play" | "insight" | "teacher"; title: string; text: string }) {
  return <div className="feature-card"><span aria-hidden="true" className={`feature-icon feature-${kind}`}><i /><b /></span><h2>{title}</h2><p>{text}</p></div>;
}

function HowStep({ kind, number, title, text }: { kind: "setup" | "generate" | "play" | "insight"; number: string; title: string; text: string }) {
  return <article className="how-step"><span aria-label={`Step ${number}`} className={`step-icon step-${kind}`} role="img" /><h3>{title}</h3><p>{text}</p></article>;
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

  return <section className="teacher-section">
    <div className="mb-8 flex flex-wrap gap-2">{["Learning setup", "Theme", "Generate", "Review", "Publish"].map((label, index) => <button className={stepButton(step === index + 1, step > index + 1)} key={label} onClick={() => setStep(index + 1)} type="button"><span>{index + 1}</span>{label}</button>)}</div>
    <div className="panel">
      {step === 1 && <><PanelTitle eyebrow="Step 1" title="Learning setup" text="Set the class context before generating a room." /><div className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Class"><select className="input-shell" defaultValue="7B Grammar Lab"><option>7B Grammar Lab</option><option>6A Language Arts</option></select></Field><Field label="Grade"><select className="input-shell" defaultValue="Grade 7"><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option></select></Field><Field label="Topic"><select className="input-shell"><option>Subject-verb agreement</option><option>Verb tense</option><option>Parts of speech</option></select></Field><Field label="Subtopic"><select className="input-shell"><option>Collective and compound subjects</option><option>Nearby noun distractors</option></select></Field></div><Field label="Stage count"><div className="mt-2 flex gap-2"><button className="choice active" type="button">3 stages</button><button className="choice" type="button">4 stages</button></div></Field></>}
      {step === 2 && <><PanelTitle eyebrow="Step 2" title="Choose a theme" text="The shared mission components stay the same; only the tone and accents change." /><div className="mt-7 grid gap-4 md:grid-cols-3">{themes.map((item) => <button className={`theme-card ${theme === item.name ? "theme-selected" : ""}`} key={item.name} onClick={() => setTheme(item.name)} type="button"><span className="text-xs font-black text-[#0f766e]">{item.accent || "Theme"}</span><span className="mt-2 block text-lg font-black">{item.name}</span><span className="mt-2 block text-sm leading-6 text-[#667085]">{item.note}</span></button>)}</div></>}
      {step === 3 && <><PanelTitle eyebrow="Step 3" title="Generate room" text="The teacher remains in control of when a draft is created." /><Field label="Optional instruction"><textarea className="input-shell mt-2 min-h-28" maxLength={250} onChange={(event) => setInstruction(event.target.value)} placeholder="For example: include a cricket-club context." value={instruction} /><span className="mt-1 block text-right text-xs text-[#657286]">{instruction.length}/250</span></Field><label className="mt-5 flex items-start gap-3 rounded-md border border-[#e8e2d7] p-4"><input checked={adaptive} className="mt-1 h-4 w-4" onChange={(event) => setAdaptive(event.target.checked)} type="checkbox" /><span><span className="block font-black">Adaptive Extra Case</span><span className="mt-1 block text-sm text-[#667085]">Offer an optional extension after the final lock.</span></span></label><button className="primary-action mt-6" onClick={() => { setGenerated(true); setStep(4); }} type="button">{generated ? "Regenerate room" : "Generate room"}</button></>}
      {step === 4 && <div className="grid gap-6 lg:grid-cols-[280px_1fr]"><aside><p className="eyebrow">Step 4</p><h2 className="mt-2 text-2xl font-black">Review and validate</h2><div className="mt-5 space-y-2">{stages.map((item) => <button className={`stage-list ${selectedStage === item.id ? "stage-selected" : ""}`} key={item.id} onClick={() => setSelectedStage(item.id)} type="button"><span className="status-dot status-ok">OK</span><span><strong>{item.title}</strong><small>All checks passed</small></span></button>)}</div></aside><div className="rounded-md border border-[#e8e2d7] p-5"><p className="eyebrow">Selected stage</p><h3 className="mt-2 text-xl font-black">{selected.title}</h3><Field label="Question text"><textarea className="input-shell mt-2 min-h-28" defaultValue={selected.prompt} /></Field><Field label="Clue token"><input className="input-shell mt-2" defaultValue={selected.token} /></Field><div className="mt-5 flex flex-wrap gap-2"><button className="secondary-action" type="button">Edit</button><button className="secondary-action" type="button">Regenerate</button><button className="secondary-action" onClick={onPreview} type="button">Test answer</button><button className="secondary-action" type="button">Duplicate room</button></div><div className="mt-6 rounded-md bg-[#eff8f3] p-4 text-sm text-[#245c45]"><strong>Validation checklist: </strong>grammar correctness, safety, grade fit, answer key, ambiguity, and story consistency are clear.</div></div></div>}
      {step === 5 && <><PanelTitle eyebrow="Step 5" title="Publish room" text="Confirm the review and choose how your class will enter the mission." /><label className="mt-6 flex gap-3 rounded-md border border-[#e8e2d7] p-4"><input className="mt-1 h-4 w-4" type="checkbox" /><span><strong>I reviewed the generated content.</strong><span className="mt-1 block text-sm text-[#667085]">Publishing is enabled after teacher review.</span></span></label><label className="mt-4 flex items-center justify-between rounded-md border border-[#e8e2d7] p-4"><span><strong>Show marks to students</strong><span className="mt-1 block text-sm text-[#667085]">Hidden by default.</span></span><input checked={marksVisible} onChange={(event) => setMarksVisible(event.target.checked)} type="checkbox" /></label><div className="mt-6 flex flex-wrap gap-3"><button className="primary-action" type="button">Copy home invite link</button><button className="secondary-action" type="button">Launch presentation mode</button></div></>}
      <div className="mt-8 flex justify-between border-t border-[#e8e2d7] pt-5"><button className="ghost-action" disabled={step === 1} onClick={previous} type="button">Back</button>{step < 5 && <button className="primary-action" onClick={next} type="button">Continue</button>}</div>
    </div>
  </section>;
}

function MissionPlayer({ theme, onDashboard }: { theme: string; onDashboard: () => void }) {
  const [sortState, setSortState] = useState<Record<string, string>>({});
  const [stageIndex, setStageIndex] = useState(0);
  const [seconds, setSeconds] = useState(720);
  const [completed, setCompleted] = useState<StageId[]>([]);
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [attempts, setAttempts] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [answer, setAnswer] = useState(stages[0].prompt);
  const [rewrite, setRewrite] = useState(["Neither the map nor the notebook were in the drawer.", "The clues was nearby."]);
  const [phase, setPhase] = useState<"launch" | "stages" | "lock" | "success">("launch");
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [lockInput, setLockInput] = useState<string[]>([]);
  const [tokenPop, setTokenPop] = useState<StageId | null>(null);

  const sortedCount = useMemo(() => evidenceCards.filter((card) => sortState[card.sentence] === card.answer).length, [sortState]);
  const current = stages[stageIndex];
  const themeClass = themes.find((t) => t.name === theme)?.cssClass ?? "detective";
  const currentTheme = themes.find((t) => t.name === theme) ?? themes[0];

  useEffect(() => { const timer = window.setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000); return () => window.clearInterval(timer); }, []);

  const completeStage = (id: StageId) => {
    setTokenPop(id);
    setTimeout(() => { setTokenPop(null); }, 500);
    setCompleted((items) => items.includes(id) ? items : [...items, id]);
    setVerdict("correct");
  };
  const markWrong = () => setAttempts((count) => { const next = count + 1; if (next >= 3) setAnswerRevealed(true); return next; });
  // Accept the target repair with surrounding text; semantic grading will replace this fallback.
  const checkSurgery = () => { if (answerRevealed) return; if (answer.toLowerCase().replace(/\s+/g, " ").includes("team is reviewing")) completeStage("surgery"); else { markWrong(); setVerdict("revise"); } };
  const checkRewrite = () => { if (answerRevealed) return; const normalized = rewrite.join(" ").toLowerCase(); if (normalized.includes("notebook was") && normalized.includes("clues were")) completeStage("rewrite"); else { markWrong(); setVerdict("revise"); } };
  const checkSort = () => { if (answerRevealed) return; if (sortedCount === evidenceCards.length) completeStage("sort"); else { markWrong(); setVerdict("revise"); } };
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const advanceStage = () => {
    if (stageIndex < 2) {
      setStageIndex(stageIndex + 1);
      setAttempts(0);
      setAnswerRevealed(false);
      setVerdict("idle");
      setAnswer(stages[Math.min(stageIndex + 1, 2)].prompt);
    } else {
      setPhase("lock");
    }
  };

  if (phase === "launch") return (
    <div className={`room-launch theme-${themeClass}`}>
      <span className="launch-icon">{currentTheme.icon}</span>
      <p className="eyebrow">{theme} mission</p>
      <h1>The Missing Verb File</h1>
      <p className="launch-desc">Recover three evidence tokens by solving grammar puzzles. Collect all tokens to unlock the final case file.</p>
      <div className="launch-stages">
        {stages.map((s, i) => (
          <div className={`launch-stage animate-slide-up-d${i + 1}`} key={s.id}>
            <span className="stage-icon">{["✏️", "📋", "📝"][i]}</span>
            <span>{s.title}</span>
          </div>
        ))}
      </div>
      <div className="launch-actions">
        <button className="btn btn-primary" onClick={() => setPhase("stages")} type="button">Begin mission</button>
      </div>
    </div>
  );

  if (phase === "success") return (
    <div className={`success theme-${themeClass}`}>
      <div className="confetti-container">
        {Array.from({ length: 10 }).map((_, i) => <div className="confetti-piece" key={i} />)}
      </div>
      <div className="card card-lg">
        <div className="success-icon success-bounce">OK</div>
        <p className="eyebrow" style={{ marginTop: 16 }}>Mission complete</p>
        <h1 style={{ fontSize: 28 }}>Case closed.</h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>You recovered every token and cracked the case.</p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={onDashboard} type="button">View results</button>
          <button className="btn btn-secondary" type="button">Back to missions</button>
        </div>
      </div>
    </div>
  );

  if (phase === "lock") return (
    <div className={`lock theme-${themeClass}`}>
      <div className="card card-lg">
        <p className="eyebrow">Final lock</p>
        <h1>Open the cabinet</h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Place your recovered tokens in stage order.</p>
        <div className="lock-slots">
          {stages.map((_, i) => (
            <div className={`lock-slot ${lockInput[i] ? "filled" : ""}`} key={i}>
              {lockInput[i] ?? ""}
            </div>
          ))}
        </div>
        <div className="lock-tokens">
          {stages.map((s) => (
            <button
              className={`token ${completed.includes(s.id) ? "earned" : ""}`}
              disabled={!completed.includes(s.id) || lockInput.includes(s.token)}
              key={s.token}
              onClick={() => setLockInput([...lockInput, s.token])}
              type="button"
            >
              {s.token}
            </button>
          ))}
        </div>
        <div className="lock-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setLockInput([])} type="button">Clear</button>
          <button
            className="btn btn-primary"
            disabled={lockInput.join(" ") !== stages.map((s) => s.token).join(" ")}
            onClick={() => setPhase("success")}
            type="button"
          >
            Unlock cabinet
          </button>
        </div>
        {lockInput.length === 3 && lockInput.join(" ") !== stages.map((s) => s.token).join(" ") && (
          <p className="lock-error shake" key={lockInput.join("")}>That order does not open the lock. Try the stage sequence.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className={`mission-player theme-${themeClass}`}>
      <div className="mission-player-header header-shimmer">
        <div>
          <span className="badge">{currentTheme.icon} {theme} mission</span>
          <h1>The Missing Verb File</h1>
          <p>Stage {stageIndex + 1} of 3 &middot; Collect all tokens to unlock the case</p>
        </div>
        <div className={`mission-timer ${seconds <= 60 ? "timer-urgent" : ""}`}>{time}</div>
      </div>
      <div className="progress-rail">
        {stages.map((stage, i) => (
          <div className={`progress-step ${completed.includes(stage.id) ? "done" : ""}`} key={stage.id}>
            <div className={`progress-step-marker ${completed.includes(stage.id) ? "done" : stageIndex === i ? "current" : ""}`}>
              {completed.includes(stage.id) ? "OK" : i + 1}
            </div>
            <div className="progress-step-label">
              <strong>{stage.title}</strong>
              <small>{completed.includes(stage.id) ? stage.token : stageIndex === i ? "In progress" : "Locked"}</small>
            </div>
            {i < stages.length - 1 && <div className={`progress-step-connector ${completed.includes(stage.id) ? "done" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="game-layout">
        <div className="game-main stage-enter" key={stageIndex}>
          <p className="eyebrow">Stage {stageIndex + 1} of 3</p>
          <h2>{current.title}</h2>
          <p className="stage-desc">{current.prompt}</p>
          {current.id === "surgery" && (
            <>
              <input aria-label="Correct the sentence" className="input animate-slide-up-d1" onChange={(e) => setAnswer(e.target.value)} style={{ marginTop: 24 }} value={answer} />
              <div className="animate-slide-up-d2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={checkSurgery} type="button">File report</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAnswer(stages[0].prompt)} type="button">Reset to original</button>
              </div>
            </>
          )}
          {current.id === "sort" && (
            <>
              <div className="sort-count animate-slide-up-d1">{sortedCount} of {evidenceCards.length} correct</div>
              <div className="animate-slide-up-d2" style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {evidenceCards.map((card, ci) => (
                  <div className={`sort-card card-slide-in-d${ci}`} key={card.sentence}>
                    <p>{card.sentence}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      {["Agrees", "Needs revision"].map((choice) => (
                        <button
                          className={`btn btn-sm ${sortState[card.sentence] === choice ? "btn-primary" : "btn-secondary"}`}
                          key={choice}
                          onClick={() => setSortState({ ...sortState, [card.sentence]: choice })}
                          type="button"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary animate-slide-up-d3" disabled={answerRevealed} onClick={checkSort} style={{ marginTop: 20 }} type="button">Submit evidence</button>
            </>
          )}
          {current.id === "rewrite" && (
            <>
              <div className="animate-slide-up-d1" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                {rewrite.map((s, i) => (
                  <input aria-label={`Rewrite sentence ${i + 1}`} className="input" key={i} onChange={(e) => setRewrite(rewrite.map((item, idx) => idx === i ? e.target.value : item))} value={s} />
                ))}
              </div>
              <button className="btn btn-primary animate-slide-up-d2" onClick={checkRewrite} style={{ marginTop: 20 }} type="button">Submit case file</button>
            </>
          )}
          <FeedbackPanel answerRevealed={answerRevealed} appealOpen={appealOpen} appealSubmitted={appealSubmitted} attempts={attempts} onAppealOpen={() => setAppealOpen(true)} onAppealSubmit={() => { setAppealSubmitted(true); setAppealOpen(false); setVerdict("appeal"); }} onGuidedContinue={() => { completeStage(current.id); advanceStage(); }} rule={current.rule} stageId={current.id} verdict={verdict} />
        </div>
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="evidence-locker">
            <p className="eyebrow">Evidence Locker</p>
            <div className="tokens">
              {stages.map((item) => (
                <span className={`token ${completed.includes(item.id) ? "earned" : ""} ${tokenPop === item.id ? "token-pop" : ""}`} key={item.id}>
                  {completed.includes(item.id) ? item.token : "Locked"}
                </span>
              ))}
            </div>
            <p className="locker-stats">{completed.length} of {stages.length} tokens recovered</p>
          </div>
          <div className="agent-note">
            <div>
              <strong>Agent Clause</strong>
              {verdict === "correct" ? "Good work! One step closer to cracking the case." : verdict === "revise" ? "That doesn't look right. Check the subject-verb match carefully." : "Examine each puzzle carefully before filing your report."}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StageProgressRail({ active, completed }: { active: number; completed: StageId[] }) { return <div className="progress-rail">{stages.map((stage, index) => <div className="progress-step" key={stage.id}><span className={`marker ${completed.includes(stage.id) ? "done" : active === index ? "current" : ""}`}>{completed.includes(stage.id) ? "OK" : index + 1}</span><span><strong>{stage.title}</strong><small>{completed.includes(stage.id) ? stage.token : active === index ? "In progress" : "Locked"}</small></span>{index < stages.length - 1 && <i />}</div>)}</div>; }

function FeedbackPanel({ answerRevealed, appealOpen, appealSubmitted, attempts, onAppealOpen, onAppealSubmit, onGuidedContinue, rule, stageId, verdict }: { answerRevealed: boolean; appealOpen: boolean; appealSubmitted: boolean; attempts: number; onAppealOpen: () => void; onAppealSubmit: () => void; onGuidedContinue: () => void; rule: string; stageId: StageId; verdict: Verdict }) {
  if (verdict === "idle") return null;
  const label = verdict === "correct" ? "Evidence verified" : verdict === "appeal" ? "Awaiting review" : "Needs revision";
  const hint = attempts > 1 ? "Final hint: check the subject-verb match carefully before submitting again." : "Hint: find the real subject before changing the verb.";
  const answers: Record<StageId, { answer: string; reason: string }> = {
    surgery: { answer: "The team is reviewing the witness notes before lunch.", reason: "Team is a singular collective noun, so it takes 'is'." },
    sort: { answer: "Agrees; Needs revision; Agrees; Needs revision.", reason: "'A stack' is singular; 'the detective and the clerk' is a compound plural subject." },
    rewrite: { answer: "Neither the map nor the notebook was in the drawer. The clues were nearby.", reason: "'Neither/nor' with singular nouns takes a singular verb; 'clues' is plural." }
  };
  return (
    <div className={`feedback-panel ${verdict === "correct" ? "correct" : verdict === "appeal" ? "appeal" : "revise"}`}>
      <div className="fb-label">
        <span className="fb-icon">{verdict === "correct" ? "OK" : verdict === "appeal" ? "..." : "!"}</span>
        {label}
      </div>
      <p style={{ fontSize: 13, marginTop: 4, color: "var(--text)" }}>Rule: {rule}</p>
      {verdict === "revise" && (
        <div className="fb-hint">{answerRevealed ? "Answer revealed after three attempts." : hint}</div>
      )}
      {answerRevealed && (
        <div className="fb-explanation">
          <strong>Correct answer: </strong>{answers[stageId].answer}<br />
          <strong>Why: </strong>{answers[stageId].reason}
          <button className="btn btn-secondary btn-sm" onClick={onGuidedContinue} style={{ marginTop: 12 }} type="button">Continue with guidance</button>
        </div>
      )}
      {verdict === "correct" && (
        <button className="btn btn-secondary btn-sm" onClick={onGuidedContinue} style={{ marginTop: 12 }} type="button">Continue to next stage</button>
      )}
      {appealSubmitted && <div className="fb-hint">Your challenge is awaiting teacher review. Keep playing.</div>}
      {!answerRevealed && !appealOpen && verdict === "revise" && (
        <button className="btn btn-ghost btn-sm" onClick={onAppealOpen} style={{ marginTop: 12 }} type="button">Challenge this result</button>
      )}
      {!answerRevealed && appealOpen && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
          <label className="label">Optional explanation</label>
          <textarea className="input" placeholder="Tell your teacher what you intended." style={{ marginTop: 6 }} />
          <button className="btn btn-secondary btn-sm" onClick={onAppealSubmit} style={{ marginTop: 8 }} type="button">Submit challenge</button>
        </div>
      )}
    </div>
  );
}

function FinalLock({ tokens, lockInput, setLockInput, onUnlock }: { tokens: string[]; lockInput: string[]; setLockInput: (tokens: string[]) => void; onUnlock: () => void }) { const rightOrder = lockInput.join(" ") === tokens.join(" "); return <section className="mx-auto max-w-xl px-5 py-14"><div className="panel text-center"><p className="eyebrow">Final lock</p><h1 className="mt-2 text-3xl font-black">Open the cabinet</h1><p className="mt-3 text-[#667085]">Enter the recovered tokens in their stage order.</p><div className="mt-7 grid grid-cols-3 gap-3">{tokens.map((_, index) => <div className="lock-slot" key={index}>{lockInput[index] ?? ""}</div>)}</div><div className="mt-6 flex flex-wrap justify-center gap-2">{tokens.map((token) => <button className="choice" disabled={lockInput.includes(token)} key={token} onClick={() => setLockInput([...lockInput, token])} type="button">{token}</button>)}</div><div className="mt-5 flex justify-center gap-2"><button className="ghost-action" onClick={() => setLockInput([])} type="button">Clear</button><button className="primary-action" disabled={!rightOrder} onClick={onUnlock} type="button">Unlock cabinet</button></div>{lockInput.length === 3 && !rightOrder && <p className="mt-4 text-sm text-[#9a3f35]">That order does not open the lock. Try the stage sequence.</p>}</div></section>; }

function SuccessScreen({ onDashboard }: { onDashboard: () => void }) { return <section className="mx-auto max-w-xl px-5 py-16"><div className="panel text-center"><span className="grid mx-auto h-12 w-12 place-items-center rounded-full bg-[#e8f6ee] font-black text-[#1d704f]">OK</span><p className="eyebrow mt-5">Mission complete</p><h1 className="mt-2 text-3xl font-black">Case closed.</h1><p className="mt-3 text-[#667085]">You recovered every token and opened the cabinet.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button className="primary-action" onClick={onDashboard} type="button">View results</button><button className="secondary-action" type="button">Back to My Missions</button><button className="ghost-action" type="button">Try Extra Case</button></div></div></section>; }

function Dashboard() { const [expanded, setExpanded] = useState<string | null>(null); const [insight, setInsight] = useState(false); const [appealsOnly, setAppealsOnly] = useState(false); const rows = appealsOnly ? studentRows.filter((row) => row.appeal !== "None") : studentRows; return <section className="teacher-section"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Class overview</p><h1 className="mt-2 text-2xl font-black">7B Grammar Lab</h1><p className="mt-1 text-sm text-[#667085]">The Missing Verb File | Subject-verb agreement</p></div><div className="flex gap-2"><button className="secondary-action" onClick={() => setAppealsOnly(!appealsOnly)} type="button">{appealsOnly ? "Show all" : "2 appeals pending"}</button><button className="primary-action" onClick={() => setInsight(true)} type="button">Get class insight</button></div></div>{insight && <div className="insight-box" style={{ marginTop: 24 }}><strong>Class insight:</strong> Most students secure collective-noun agreement, while nearby distractors and neither/nor structures need a short reteach before the next mission.</div>}<div className="metric-grid" style={{ marginTop: 24 }}><Metric label="Completion" value="86%" /><Metric label="First attempt" value="68%" /><Metric label="Hints used" value="14" /><Metric label="Appeals" value="2" /></div><div className="panel" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>{rows.map((row) => <div className="border-b border-[#e8e2d7] last:border-0" key={row.name}><button className="grid w-full gap-3 px-4 py-4 text-left text-sm sm:grid-cols-[1.3fr_0.7fr_0.55fr_0.7fr_0.7fr]" onClick={() => setExpanded(expanded === row.name ? null : row.name)} type="button"><span><strong className="block">{row.name}</strong><small>{row.roll}</small></span><span>{row.status}</span><span className="font-black">{row.score}</span><span><span className="status-icon">{row.mastery === "Secure" ? "OK" : "!"}</span>{row.mastery}</span><span>{row.appeal}</span></button>{expanded === row.name && <div className="border-t border-[#e8e2d7] bg-[#f8fafc] px-4 py-4 text-sm text-[#667085]"><strong className="text-[#172235]">Attempt detail: </strong>{row.detail}<div className="mt-3 flex gap-2"><button className="secondary-action" type="button">Open item detail</button>{row.appeal !== "None" && <button className="secondary-action" type="button">Review appeal</button>}</div></div>}</div>)}</div></section>; }

function PanelTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div><p className="eyebrow">{eyebrow}</p><h1 className="text-2xl font-black" style={{ marginTop: 8 }}>{title}</h1><p className="max-w-2xl" style={{ marginTop: 8, color: "var(--text-secondary)" }}>{text}</p></div>; }
function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="field-label" style={{ marginTop: 20 }}><span>{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric-card"><p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>; }
function stepButton(active: boolean, complete: boolean) { return `step-button ${active ? "step-active" : ""} ${complete ? "step-complete" : ""}`; }
