"use client";

import { useEffect, useMemo, useState } from "react";
import { TeacherPortal } from "../components/teacher-portal";
import { LuPalette, LuZap, LuChartBar, LuTarget, LuSun, LuMoon } from "react-icons/lu";

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
  { id: "surgery", title: "Sentence Surgery", token: "CASE", rule: "Does the verb agree with the singular collective noun team?", prompt: "The team are reviewing the witness notes before lunch.", hint: "Team is a singular collective noun here, so its verb should be singular." },
  { id: "sort", title: "Evidence Sort", token: "FILE", rule: "Find the real subject before deciding whether its verb agrees.", prompt: "Classify each sentence as agreeing or needing revision.", hint: "Ignore prepositional phrases and look for the noun doing the action." },
  { id: "rewrite", title: "Case File Rewrite", token: "OPEN", rule: "Check each linked sentence for the subject that controls its verb.", prompt: "Repair both statements in the case file.", hint: "Neither/nor with singular nouns takes a singular verb; clues is plural." },
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
  { name: "Detective Office", cssClass: "detective", note: "Case files, evidence tags, and cabinet locks.", icon: "🕵️" },
  { name: "Cursed Castle", cssClass: "castle", note: "Runes, sealed doors, and lost manuscripts.", icon: "🏰" },
  { name: "Sci-Fi Lab", cssClass: "scifi", note: "Keycards, terminals, and system diagnostics.", icon: "🚀" },
];

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [wizardStep, setWizardStep] = useState(1);
  const [theme, setTheme] = useState(themes[0].name);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(window.localStorage.getItem("clause-color-mode") === "dark");
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("app-dark", darkMode); }, [darkMode]);
  const toggleDarkMode = () => { setDarkMode((prev) => { const next = !prev; window.localStorage.setItem("clause-color-mode", next ? "dark" : "light"); return next; }); };
  const themeClass = themes.find((t) => t.name === theme)?.cssClass ?? "detective";

  return (
    <main className={`min-h-screen ${view === "missions" || view === "dashboard" ? `theme-${themeClass}` : ""}`}>
      <Header darkMode={darkMode} onHome={() => setView("landing")} onTeacher={() => setView("teacher")} onToggleTheme={toggleDarkMode} themeClass={view === "missions" || view === "dashboard" ? themeClass : undefined} />
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
    <button className="site-logo" onClick={onHome} type="button"><span className="site-logo-mark">C</span><span>CLAUSE</span></button>
    <nav className="site-nav"><button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} type="button">How it works</button><button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} type="button">Features</button><button onClick={onTeacher} type="button">For teachers</button><button onClick={() => document.getElementById("sample-room")?.scrollIntoView({ behavior: "smooth" })} type="button">Sample room</button></nav>
    <div className="site-actions"><button aria-label={darkMode ? "Use light mode" : "Use dark mode"} className="theme-btn" onClick={onToggleTheme} title={darkMode ? "Use light mode" : "Use dark mode"} type="button">{darkMode ? <LuSun size={16} /> : <LuMoon size={16} />}</button><button className="btn btn-ghost btn-sm" onClick={onTeacher} type="button">Sign in</button><button className="btn btn-primary btn-sm" onClick={onTeacher} type="button">Create a room</button></div>
  </div></header><nav className="mobile-nav"><button onClick={onHome} type="button">Home</button><button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} type="button">How it works</button><button onClick={onTeacher} type="button">Teachers</button><button onClick={onToggleTheme} type="button">{darkMode ? <LuSun size={14} /> : <LuMoon size={14} />}</button></nav></>;
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
        const r = section.getBoundingClientRect();
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
  useMouseParallax("sample-room");
  useCardTilt();
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-in]").forEach((el) => {
        try { el.animate([{ opacity: "0", transform: "translateY(36px)" }, { opacity: "1", transform: "translateY(0)" }], { duration: 700, easing: "ease-out", delay: (parseFloat(el.dataset.in || "0")) * 1000, fill: "forwards" }); } catch { /* noop */ }
      });
    }, 50);
    return () => clearTimeout(t);
  }, []);
  return <>
    <section className="hero" id="sample-room">
      <div className="hero-glow" />
      <div className="hero-grid" />
      <div className="hero-grid-line" />
      <div className="hero-mouse-glow" />
      <div className="hero-floating-shapes">
        <div className="hero-shape s1" />
        <div className="hero-shape s2" />
        <div className="hero-shape s3" />
        <div className="hero-shape s4" />
      </div>
      <div className="hero-inner">
        <div data-in="0" className="hero-tag">AI grammar escape rooms</div>
        <h1 data-in=".12">Grammar practice, but make it an <em>adventure.</em></h1>
        <p data-in=".24">Create teacher-reviewed grammar rooms in minutes. Students solve, reflect, and build confidence while you see exactly where to help next.</p>
        <div data-in=".36" className="hero-actions">
          <button className="btn btn-primary btn-glow" onClick={onCreate} type="button">Create a room <span aria-hidden="true">&rarr;</span></button>
          <button className="btn btn-secondary btn-glass" onClick={onSample} type="button">Try sample room</button>
        </div>
        <div data-in=".5" className="hero-badges">
          <span className="hero-badge">Try a wrong answer</span>
          <span className="hero-badge-sep">&middot;</span>
          <span className="hero-badge">Challenge a result</span>
          <span className="hero-badge-sep">&middot;</span>
          <span className="hero-badge">Inspect the dashboard</span>
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
          <div className="feature-card" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><LuPalette /></div><h3>AI-generated rooms</h3><p>Custom grammar puzzles tailored to your class, ready for teacher review before publishing.</p><div className="feature-card-accent" /></div></div>
          <div className="feature-card" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><LuZap /></div><h3>Engaging gameplay</h3><p>Short, story-led challenges with immediate feedback that keep students motivated.</p><div className="feature-card-accent" /></div></div>
          <div className="feature-card" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><LuChartBar /></div><h3>Real insights</h3><p>Spot progress, misconceptions, hints used, and appeals — see exactly who needs help.</p><div className="feature-card-accent" /></div></div>
          <div className="feature-card" data-reveal data-tilt><div className="card-tilt-layer"><div className="feature-card-icon"><LuTarget /></div><h3>Teacher friendly</h3><p>Create, assign, and review in minutes with zero setup or training required.</p><div className="feature-card-accent" /></div></div>
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
    <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><span>C</span>Clause</div><nav className="footer-nav"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#sample-room">Sample room</a><button className="btn-ghost btn-sm" onClick={onCreate} type="button">For teachers</button></nav><span className="footer-copy">&copy; 2026 Clause. Grammar, made visible.</span></div></footer>
  </>;
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

  return <div className="wizard">
    <div className="wizard-steps">{["Learning setup", "Theme", "Generate", "Review", "Publish"].map((label, i) => <button className={`wizard-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`} key={label} onClick={() => setStep(i + 1)} type="button"><span>{i + 1}</span>{label}</button>)}</div>
    <div className="card card-lg">
      {step === 1 && <><div><p className="eyebrow">Step 1</p><h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Learning setup</h1><p style={{ marginTop: 8, color: "var(--text-secondary)", maxWidth: 560 }}>Set the class context before generating a room.</p></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}><label className="label">Class<select className="input" defaultValue="7B Grammar Lab" style={{ marginTop: 6 }}><option>7B Grammar Lab</option><option>6A Language Arts</option></select></label><label className="label">Grade<select className="input" defaultValue="Grade 7" style={{ marginTop: 6 }}><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option></select></label><label className="label">Topic<select className="input" style={{ marginTop: 6 }}><option>Subject-verb agreement</option><option>Verb tense</option><option>Parts of speech</option></select></label><label className="label">Subtopic<select className="input" style={{ marginTop: 6 }}><option>Collective and compound subjects</option><option>Nearby noun distractors</option></select></label></div><label className="label" style={{ marginTop: 20 }}>Stage count<div style={{ display: "flex", gap: 8, marginTop: 8 }}><button className="btn btn-primary btn-sm" type="button">3 stages</button><button className="btn btn-secondary btn-sm" type="button">4 stages</button></div></label></>}
      {step === 2 && <><div><p className="eyebrow">Step 2</p><h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Choose a theme</h1>      <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Pick a vibe for your adventure — same puzzles, different flavor!</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>{themes.map((item) => <button className={`theme-card ${theme === item.name ? "selected" : ""}`} key={item.name} onClick={() => setTheme(item.name)} type="button"><div className="theme-card-label">{item.icon} {item.name === theme ? "Selected" : "Theme"}</div><h3>{item.name}</h3><p>{item.note}</p></button>)}</div></>}
      {step === 3 && <><div><p className="eyebrow">Step 3</p><h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Generate room</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>The teacher remains in control of when a draft is created.</p></div><label className="label" style={{ marginTop: 20 }}>Optional instruction<textarea className="input" maxLength={250} onChange={(e) => setInstruction(e.target.value)} placeholder="For example: include a cricket-club context." style={{ marginTop: 6, minHeight: 100 }} value={instruction} /><span style={{ display: "block", textAlign: "right", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{instruction.length}/250</span></label><label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 20, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}><input checked={adaptive} className="input" onChange={(e) => setAdaptive(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2 }} type="checkbox" /><span><strong style={{ display: "block" }}>Adaptive Extra Case</strong><span style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Offer an optional extension after the final lock.</span></span></label><button className="btn btn-primary" onClick={() => { setGenerated(true); setStep(4); }} style={{ marginTop: 24 }} type="button">{generated ? "Regenerate room" : "Generate room"}</button></>}
      {step === 4 && <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}><aside><p className="eyebrow">Step 4</p><h2 style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>Review and validate</h2><div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>{stages.map((item) => <button className={`stage-list ${selectedStage === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedStage(item.id)} type="button"><span className="stage-dot ok">OK</span><span><strong>{item.title}</strong><small>All checks passed</small></span></button>)}</div></aside><div className="card-sm"><p className="eyebrow">Selected stage</p><h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 8 }}>{selected.title}</h3><label className="label" style={{ marginTop: 16 }}>Question text<textarea className="input" defaultValue={selected.prompt} style={{ marginTop: 6, minHeight: 100 }} /></label><label className="label" style={{ marginTop: 16 }}>Clue token<input className="input" defaultValue={selected.token} style={{ marginTop: 6 }} /></label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}><button className="btn btn-secondary btn-sm" type="button">Edit</button><button className="btn btn-secondary btn-sm" type="button">Regenerate</button><button className="btn btn-secondary btn-sm" onClick={onPreview} type="button">Test answer</button><button className="btn btn-secondary btn-sm" type="button">Duplicate room</button></div><div className="card-sm" style={{ marginTop: 20, background: "var(--success-light)", border: "1px solid var(--success)" }}><strong>Validation: </strong><span style={{ fontSize: 13 }}>grammar correctness, safety, grade fit, answer key, ambiguity, and story consistency are clear.</span></div></div></div>}
      {step === 5 && <><div><p className="eyebrow">Step 5</p><h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Publish room</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Confirm the review and choose how your class will enter the mission.</p></div><label style={{ display: "flex", gap: 12, marginTop: 24, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}><input className="input" style={{ width: 18, height: 18, marginTop: 2 }} type="checkbox" /><span><strong>I reviewed the generated content.</strong><span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Publishing is enabled after teacher review.</span></span></label><label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}><span><strong>Show marks to students</strong><span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Hidden by default.</span></span><input checked={marksVisible} className="input" onChange={(e) => setMarksVisible(e.target.checked)} style={{ width: 18, height: 18 }} type="checkbox" /></label><div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}><button className="btn btn-primary" type="button">Copy home invite link</button><button className="btn btn-secondary" type="button">Launch presentation mode</button></div></>}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", marginTop: 24, paddingTop: 20 }}><button className="btn btn-ghost" disabled={step === 1} onClick={previous} type="button">Back</button>{step < 5 && <button className="btn btn-primary" onClick={next} type="button">Continue</button>}</div>
    </div>
  </div>;
}

function MissionPlayer({ theme, onDashboard }: { theme: string; onDashboard: () => void }) {
  const [mpShow, setMpShow] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setMpShow(true))); return () => cancelAnimationFrame(r); }, []);
  const [stageIndex, setStageIndex] = useState(0);
  const [answer, setAnswer] = useState(stages[0].prompt);
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [attempts, setAttempts] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [sortState, setSortState] = useState<Record<string, string>>({});
  const [rewrite, setRewrite] = useState(["Neither the map nor the notebook were in the drawer.", "The clues was nearby."]);
  const [completed, setCompleted] = useState<StageId[]>([]);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [lockInput, setLockInput] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(720);
  const [success, setSuccess] = useState(false);
  const sortedCount = useMemo(() => evidenceCards.filter((card) => sortState[card.sentence] === card.answer).length, [sortState]);
  const current = stages[stageIndex];
  const themeClass = themes.find((t) => t.name === theme)?.cssClass ?? "detective";

  useEffect(() => { const timer = window.setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000); return () => window.clearInterval(timer); }, []);
  const completeStage = (id: StageId) => { setCompleted((items) => items.includes(id) ? items : [...items, id]); setVerdict("correct"); };
  const markWrong = () => setAttempts((count) => { const next = count + 1; if (next >= 3) setAnswerRevealed(true); return next; });
  const checkSurgery = () => { if (answerRevealed) return; if (answer.toLowerCase().replace(/\s+/g, " ").includes("team is reviewing")) completeStage("surgery"); else { markWrong(); setVerdict("revise"); } };
  const checkRewrite = () => { if (answerRevealed) return; const n = rewrite.join(" ").toLowerCase(); if (n.includes("notebook was") && n.includes("clues were")) completeStage("rewrite"); else { markWrong(); setVerdict("revise"); } };
  const checkSort = () => { if (answerRevealed) return; if (sortedCount === evidenceCards.length) completeStage("sort"); else { markWrong(); setVerdict("revise"); } };
  const allComplete = completed.length === stages.length;
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (success) return <div className="success"><div className="confetti-container"><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /><div className="confetti-piece" /></div><div className="card card-lg"><div className="success-icon">OK</div><p className="eyebrow" style={{ marginTop: 16 }}>Mission complete</p><h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>Case closed.</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>You recovered every token and opened the cabinet.</p><div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24 }}><button className="btn btn-primary" onClick={onDashboard} type="button">View results</button><button className="btn btn-secondary" type="button">Back to My Missions</button></div></div></div>;
  if (allComplete && stageIndex === 2) return <div className="lock"><div className="card card-lg"><p className="eyebrow">Final lock</p><h1 style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>Open the cabinet</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Enter the recovered tokens in their stage order.</p><div className="lock-slots">{stages.map((_, i) => <div className="lock-slot" key={i}>{lockInput[i] ?? ""}</div>)}</div><div className="lock-tokens">{stages.map((s) => <button className="token" disabled={lockInput.includes(s.token)} key={s.token} onClick={() => setLockInput([...lockInput, s.token])} type="button">{s.token}</button>)}</div><div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}><button className="btn btn-ghost btn-sm" onClick={() => setLockInput([])} type="button">Clear</button><button className="btn btn-primary" disabled={lockInput.join(" ") !== stages.map((s) => s.token).join(" ")} onClick={() => setSuccess(true)} type="button">Unlock cabinet</button></div>{lockInput.length === 3 && lockInput.join(" ") !== stages.map((s) => s.token).join(" ") && <p style={{ marginTop: 12, fontSize: 13, color: "var(--error)" }}>That order does not open the lock. Try the stage sequence.</p>}</div></div>;

  return <div className={`mission-player theme-${themeClass} ${mpShow ? "an-show" : ""}`}>
    <div className={`mission-player-header ${mpShow ? "an-show" : ""}`}>
      <div><span className="badge" style={{ background: "var(--accent-light)", color: "var(--gold-hover)" }}>Agency training case</span><h1>The Missing Verb File</h1><p>{theme} &middot; Recover three evidence tags to open the Evidence Locker.</p></div>
      <div className="mission-timer">Case time {time}</div>
    </div>
    <div className={`progress-rail ${mpShow ? "an-show" : ""}`}>{stages.map((stage, i) => <div className="progress-step" key={stage.id}><div className={`progress-step-marker ${completed.includes(stage.id) ? "done" : stageIndex === i ? "current" : ""}`}>{completed.includes(stage.id) ? "OK" : i + 1}</div><div className="progress-step-label"><strong>{stage.title}</strong><small>{completed.includes(stage.id) ? stage.token : stageIndex === i ? "In progress" : "Locked"}</small></div>{i < stages.length - 1 && <div className="progress-step-connector" />}</div>)}</div>
    <div className={`game-layout ${mpShow ? "an-show" : ""}`}>
      <div className="game-main"><p className="eyebrow">Evidence Room {stageIndex + 1} of 3</p><h2>{current.title}</h2><p className="hint-text">{current.prompt}</p>
        {current.id === "surgery" && <><input aria-label="Correct the sentence" className="input" onChange={(e) => setAnswer(e.target.value)} style={{ marginTop: 24 }} value={answer} /><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}><button className="btn btn-primary" onClick={checkSurgery} type="button">File report</button><button className="btn btn-ghost btn-sm" onClick={() => setAnswer(stages[0].prompt)} type="button">Reset to original</button></div></>}
        {current.id === "sort" && <><div className="sort-count">{sortedCount} of {evidenceCards.length} evidence cards correct</div><div style={{ display: "grid", gap: 12, marginTop: 16 }}>{evidenceCards.map((card) => <div className="sort-card" key={card.sentence}><p>{card.sentence}</p><div style={{ display: "flex", gap: 8, marginTop: 12 }}>{["Agrees", "Needs revision"].map((choice) => <button className={`btn btn-sm ${sortState[card.sentence] === choice ? "btn-primary" : "btn-secondary"}`} key={choice} onClick={() => setSortState({ ...sortState, [card.sentence]: choice })} type="button">{choice}</button>)}</div></div>)}</div><button className="btn btn-primary" disabled={answerRevealed} onClick={checkSort} style={{ marginTop: 20 }} type="button">Submit evidence</button></>}
        {current.id === "rewrite" && <><div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>{rewrite.map((s, i) => <input aria-label={`Rewrite sentence ${i + 1}`} className="input" key={i} onChange={(e) => setRewrite(rewrite.map((item, idx) => idx === i ? e.target.value : item))} value={s} />)}</div><button className="btn btn-primary" onClick={checkRewrite} style={{ marginTop: 20 }} type="button">Submit case file</button></>}
        <FeedbackPanel answerRevealed={answerRevealed} appealOpen={appealOpen} appealSubmitted={appealSubmitted} attempts={attempts} onAppealOpen={() => setAppealOpen(true)} onAppealSubmit={() => { setAppealSubmitted(true); setAppealOpen(false); setVerdict("appeal"); }} onGuidedContinue={() => { completeStage(current.id); setAppealOpen(false); setAttempts(0); setAnswerRevealed(false); setVerdict("idle"); if (stageIndex < 2) setStageIndex(stageIndex + 1); }} rule={current.rule} stageId={current.id} verdict={verdict} />
        {verdict === "correct" && !allComplete && <button className="btn btn-secondary" onClick={() => { setStageIndex(Math.min(2, stageIndex + 1)); setAttempts(0); setAnswerRevealed(false); setVerdict("idle"); }} style={{ marginTop: 20 }} type="button">Inspect next evidence</button>}
      </div>
      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="evidence-locker"><p className="eyebrow">Evidence Locker</p><div className="tokens">{stages.map((item) => <span className={`token ${completed.includes(item.id) ? "earned" : ""}`} key={item.id}>{completed.includes(item.id) ? item.token : "Locked"}</span>)}</div><p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>{completed.length} lock{completed.length !== 1 ? "s" : ""} disengaged</p></div>
        <div className="agent-note"><div><strong>Agent Clause 🕵️</strong>That verb looks suspicious. Inspect the evidence closely!</div></div>
      </aside>
    </div>
  </div>;
}

function FeedbackPanel({ answerRevealed, appealOpen, appealSubmitted, attempts, onAppealOpen, onAppealSubmit, onGuidedContinue, rule, stageId, verdict }: { answerRevealed: boolean; appealOpen: boolean; appealSubmitted: boolean; attempts: number; onAppealOpen: () => void; onAppealSubmit: () => void; onGuidedContinue: () => void; rule: string; stageId: StageId; verdict: Verdict }) {
  if (verdict === "idle") return null;
  const label = verdict === "correct" ? "Evidence Verified" : verdict === "appeal" ? "Awaiting review" : "Reopen the case";
  const hint = attempts > 1 ? "Final guidance: repair the agreement before submitting again." : "Hint: identify the subject before you change the verb.";
  const answers: Record<StageId, { answer: string; reason: string }> = { surgery: { answer: "The team is reviewing the witness notes before lunch.", reason: "Team is singular, so it takes is." }, sort: { answer: "Agrees; Needs revision; Agrees; Needs revision.", reason: "Stack is singular, while detective and clerk make a plural subject." }, rewrite: { answer: "Neither the map nor the notebook was in the drawer. The clues were nearby.", reason: "Use was with the singular neither/nor pair and were with plural clues." } };
  return <div className={`feedback-panel an-show ${verdict === "correct" ? "correct" : verdict === "appeal" ? "appeal" : "revise"}`}><strong style={{ fontSize: 13 }}>Checking:</strong> {rule}<div className="fb-label"><span className="fb-icon">{verdict === "correct" ? "OK" : verdict === "appeal" ? "..." : "!"}</span>{label}</div>{verdict === "revise" && <div className="fb-hint">{answerRevealed ? "Answer revealed after three reports." : hint}</div>}{answerRevealed && <div className="card-sm" style={{ marginTop: 12, background: "var(--surface)" }}><strong>Correct report: </strong>{answers[stageId].answer}<br /><strong>Why: </strong>{answers[stageId].reason}<button className="btn btn-secondary btn-sm" onClick={onGuidedContinue} style={{ marginTop: 12 }} type="button">Inspect next evidence</button></div>}{appealSubmitted && <div className="fb-hint">Your note is awaiting teacher review. You can keep playing.</div>}{!answerRevealed && !appealOpen && verdict !== "appeal" && <button className="btn btn-ghost btn-sm" onClick={onAppealOpen} style={{ marginTop: 12 }} type="button">Challenge this result</button>}{!answerRevealed && appealOpen && <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}><label className="label">Optional explanation<textarea className="input" placeholder="Tell your teacher what you intended." style={{ marginTop: 6 }} /></label><button className="btn btn-secondary btn-sm" onClick={onAppealSubmit} style={{ marginTop: 8 }} type="button">Submit challenge</button></div>}</div>;
}

function Dashboard() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [insight, setInsight] = useState(false);
  const [appealsOnly, setAppealsOnly] = useState(false);
  const rows = appealsOnly ? studentRows.filter((r) => r.appeal !== "None") : studentRows;
  return <div className="teacher-section">
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
      <div><p className="eyebrow">Class overview</p><h1>7B Grammar Lab</h1><p style={{ marginTop: 4, fontSize: 14, color: "var(--text-secondary)" }}>The Missing Verb File &middot; Subject-verb agreement</p></div>
      <div style={{ display: "flex", gap: 8 }}><button className="btn btn-secondary btn-sm" onClick={() => setAppealsOnly(!appealsOnly)} type="button">{appealsOnly ? "Show all" : "2 appeals pending"}</button><button className="btn btn-primary btn-sm" onClick={() => setInsight(true)} type="button">Get class insight</button></div>
    </div>
    {insight && <div className="insight-box"><strong>Class insight:</strong> Most students secure collective-noun agreement, while nearby distractors and neither/nor structures need a short reteach before the next mission.</div>}
    <div className="metric-grid" style={{ marginTop: 24 }}><Metric label="Completion" value="86%" /><Metric label="First attempt" value="68%" /><Metric label="Hints used" value="14" /><Metric label="Appeals" value="2" /></div>
    <div className="card" style={{ marginTop: 24, overflow: "hidden" }}><table className="data-table"><thead><tr><th>Student</th><th>Status</th><th>Score</th><th>Time</th><th>Appeal</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td><strong style={{ display: "block" }}>{row.name}</strong><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.roll}</span></td><td>{row.status}</td><td style={{ fontWeight: 900 }}>{row.score}</td><td>{row.time}</td><td>{row.appeal}</td></tr>)}</tbody></table></div>
    <div className="card card-lg" style={{ marginTop: 24 }}><p className="eyebrow">Mastery overview</p><div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>{rows.map((row) => <div key={row.name}><button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === row.name ? null : row.name)} style={{ width: "100%", justifyContent: "flex-start", padding: "8px 0" }} type="button"><span style={{ flex: 1, textAlign: "left" }}><strong>{row.name}</strong><span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>{row.roll}</span></span><span className="badge" style={{ background: row.mastery === "Secure" ? "var(--success-light)" : row.mastery === "Developing" ? "var(--warning-light)" : "var(--error-light)", color: row.mastery === "Secure" ? "var(--success)" : row.mastery === "Developing" ? "var(--warning)" : "var(--error)" }}>{row.mastery}</span></button>{expanded === row.name && <div className="card-sm" style={{ marginTop: 4 }}>{row.detail}</div>}</div>)}</div></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric-card"><div className="metric-label">{label}</div><div className="metric-value">{value}</div></div>;
}
