# Clause — Product Requirements Document

**Status:** Build-ready MVP specification  
**Product name:** Clause (working name)  
**Primary release:** OpenAI Build Week hackathon demo  
**Primary users:** Hackathon judges first; teachers and Grades 6–9 students next  
**Last updated:** 2026-07-18

## 1. Product summary

Clause is a browser-based grammar escape-room platform for Grades 6–9. A teacher chooses a grade, grammar topic, subtopic, theme, and room length; Clause generates a short themed room that the teacher reviews before assigning. Students solve grammar puzzles in a playful interface, including free-text corrections graded for the grammar rule being tested rather than against one exact answer string.

The product supports two modes:

- **Individual home play:** A student signs in through a room-specific invite link. Results attach to a persistent learner profile.
- **Teacher-led presentation mode:** A teacher runs the same room from a shared classroom screen. The class solves it collectively; Clause records one aggregate class session rather than individual student data.

The central premise: grammar tools should assess whether learners understood the relevant rule, not merely whether they matched a prewritten answer. AI is used for semantic grading, contextual hints, appeals, validation, optional adaptive practice, and actionable summaries. Deterministic puzzles stay deterministic.

## 2. Problem, opportunity, and goals

Teachers need grammar practice that is engaging, short enough for real lessons, and informative about the mistakes students actually make. Existing escape-room and quiz tools usually require manual authoring and grade only multiple-choice or exact-string answers.

Clause will:

1. Demonstrate a polished, judge-friendly AI learning loop.
2. Let a teacher create a reviewed 3–4 stage grammar room quickly.
3. Grade free-text grammar by the target rule, not a single answer string.
4. Support shared-screen classroom play and individual home assignments.
5. Give teachers usable individual progress and misconception data.

### Non-goals for the MVP

- Live multiplayer synchronization or leaderboards.
- Student email collection.
- Public template marketplace or cross-teacher content sharing.
- Audio, printable certificates, CSV/PDF export, or a dedicated settings area.
- Full offline play.
- Separate bespoke game mechanics for every theme.
- A general free-text custom grammar-topic generator.

## 3. Target users

### Hackathon judges

Judges need to understand the concept in minutes, observe real AI behavior, and explore a safe sample without creating an account.

### Teachers

Teachers create classes and rooms, review generated content, assign individual work, launch projected sessions, inspect progress, and resolve appeals.

### Students

Students are approximately 11–14 years old (Grades 6–9). They need a short, playful, age-appropriate experience that still delivers clear educational feedback.

## 4. Product principles

1. **Teacher control before student play.** AI rooms are drafts. Teachers can review, edit, regenerate, test, and validate before publishing.
2. **Visible instructional value.** Students see a concise rule check, verdict, and targeted hint; they do not receive opaque black-box judgments.
3. **Deterministic where possible.** Sorts and matches are app-graded. AI is reserved for semantic tasks and explanations.
4. **Ambiguity favors the learner.** Uncertain answers receive provisional credit and teacher review instead of an unsupported hard wrong.
5. **Fun supports learning.** Clues, locks, and themed language motivate without obscuring scores or grammar feedback.
6. **Minimal student data.** Student email is not required. Full name and roll number are collected because teachers need student-level tracking.

## 5. MVP scope

### Must demonstrate

- Landing page with teacher entry and sample-room entry.
- Teacher room-generation wizard.
- Detective Office as the most polished theme.
- Three-stage subject–verb agreement sample room.
- Sentence Surgery free-text correction with semantic AI grading.
- Evidence Sort with deterministic grading.
- Case File Rewrite with semantic AI grading.
- Rule check, verdict, progressive hint, and appeal flow.
- Teacher review/edit/revalidate flow.
- Basic teacher dashboard with class/student metrics and appeal handling.
- Read-only demo dashboard and guest sample room.

### Include when feasible

- Authentication and persistent teacher/class/student records.
- Individual invite-link assignment flow.
- Presentation mode.
- Cursed Castle and Sci-Fi Lab theme variants using shared components.
- On-demand AI class insight.
- Adaptive Extra Case.

### Roadmap

- Multi-class membership for one student.
- Group/device-code mode.
- Public templates and marketplace.
- Advanced accessibility controls beyond the baseline.
- Export, school administration, and full account-management workflows.
- Rich illustrations, audio, and elaborate animation.

## 6. Curriculum and content boundaries

### Supported initial topics

| Topic | Initial subtopics |
| --- | --- |
| Parts of speech | nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, mixed identification |
| Verb tense | simple present/past/future, continuous tenses, perfect tenses, mixed tense consistency |
| Subject–verb agreement | singular/plural subjects, compound subjects, indefinite pronouns, collective nouns |
| Punctuation, fragments, and run-ons | sentence boundaries, commas, capitalization/end punctuation, dialogue punctuation, mixed repair |

Teachers select one main topic and one subtopic. Grade level (6–9) controls vocabulary, sentence complexity, distractors, and edge cases.

Clause uses Indian/British English by default but accepts American spelling when it is unrelated to the assessed grammar rule. Generated content must be globally understandable and age appropriate. It may use school, sports, travel, animals, inventions, mysteries, and space. It must avoid politics, religion, inappropriate material, stereotypes, dangerous crime framing, graphic/scary content, and unnecessary competitive pressure.

## 7. Themes and game framing

All themes use the same shared game components: cards, progress, clue tokens, lock input, feedback panels, and subtle motion. Themes differ through title, locked story, copy, palette, icons, clue presentation, and terminology.

| Theme | Tone and framing | Example vocabulary |
| --- | --- | --- |
| Detective Office | Light, clever, kid-safe mystery; one central case links all stages | evidence, case file, witness note, clue |
| Cursed Castle | Adventurous magical escape with no horror emphasis | rune, spellbook, tower lock |
| Sci-Fi Lab | Clean, futuristic repair mission | diagnostic, access panel, transmission |

Detective Office receives the most bespoke polish for the hackathon. The sample room tells one central mystery through three evidence stages.

Each generated room receives an automatically generated title and opening story. These are locked to direct editing but may be regenerated. Teachers choose a theme before generation; changing themes afterward starts a new draft.

## 8. Identity and data

### Teacher accounts

- Email/password sign-up and sign-in for MVP.
- Basic email password-reset link.
- A teacher creates and owns classes, rooms, assignments, student data, and session data.
- Before publishing, the teacher confirms that they reviewed AI content and are authorized to create student learning records.

### Student accounts

A room-specific invite link opens registration and automatically enrolls the student in the relevant class and assignment. Required registration fields:

- Full name
- Roll number
- Globally unique username
- Password

Do not collect student email, date of birth, or public profile information. Full names and roll numbers are visible only to the relevant teacher. Students never see a roster, leaderboard, or peer marks.

For MVP, a student belongs to one teacher class. Teachers can correct learner names and roll numbers, reset student passwords, remove access, and delete records. Duplicate roll numbers are allowed but flagged for teacher correction. Removal revokes access while retaining historic records until explicit deletion.

## 9. Teacher workflow

### 9.1 Entry and class creation

Landing-page primary actions:

- **Try sample room**
- **Create a room**

Teacher sign-in is in the header. The page should communicate both student engagement and teacher insight.

A class requires only:

- Class name
- Grade level

### 9.2 Room creation wizard

1. **Learning setup:** class, grade, topic, subtopic, and 3 or 4 stages.
2. **Theme:** Detective Office, Cursed Castle, or Sci-Fi Lab.
3. **Generate:** optional teacher instruction (maximum 250 characters) and Adaptive Extra Case toggle, disabled by default.
4. **Review:** preview, edit/regenerate, test answers, and validate.
5. **Publish:** confirm review, choose marks visibility, share the home link and/or launch presentation mode.

Generation begins only after an explicit **Generate room** action. A themed 5–15 second loading state is acceptable, for example “Reviewing the case files…”

### 9.3 Review and validation

Teachers can:

- Edit question text, answers, rubrics, distractors, and puzzle details.
- Regenerate a stage.
- Use suggested controls or free text to guide regeneration.
- Test arbitrary answers against the same live grading flow used by students.
- Duplicate a room exactly and optionally refresh content into a new draft.
- Preview the student experience, including clues, hints, and final lock.

Every generated or edited stage is revalidated for grammar correctness, grade suitability, kid-safe content, answer-key integrity, ambiguity, and story consistency. Show green/yellow/red stage cards that open a detailed checklist.

- Critical problems block publishing: grammar errors, unsafe content, broken answer keys, invalid clue tokens.
- Non-critical issues only warn: weak distractors or slight story inconsistency.
- Validation suggests alternate accepted answers or rubric changes where ambiguity exists.
- Test-answer use is strongly recommended, not compulsory. Validation is compulsory.

### 9.4 Publishing and assignment

Rooms move from **draft** to **published/assigned**. A teacher can:

- Launch presentation mode.
- Copy a room-specific home invite link.
- Keep a room active until manually stopped.
- Close a room, leaving students a read-only results view.
- Reopen an assignment for selected students.
- Reset an individual attempt while retaining the prior attempt in the learner record.

Numeric marks are hidden from students by default. Teachers can change the setting after students finish; completed results update immediately.

## 10. Student experience

### 10.1 My Missions and timer

After sign-in, students see active assignments as **My Missions**. Closed assignments remain accessible as read-only results.

The room starts when the student clicks **Start mission**. The timer measures real elapsed time and continues through refreshes, browser closure, idle time, and temporary disconnection. An unfinished active attempt restores when the learner returns; this is not a replay or voluntary restart.

### 10.2 Stage structure

Rooms contain 3 or 4 stages. Puzzle size varies by type:

| Puzzle type | Typical stage size |
| --- | --- |
| Sentence Surgery | one sentence correction |
| Evidence Sort / Grammar Scanner | four to six quick classifications |
| Case File Rewrite | two to three linked sentences |
| Clue Match | three matches |

Show partial progress within multi-item stages. Release the full clue token only after the complete stage is solved. Guidance applies to the item where the learner is stuck without blocking other items.

### 10.3 Free-text correction and feedback

The original sentence is inline-editable from the start. It is not pre-highlighted, because this would reveal the target error. Include a **Reset to original** action.

The feedback flow after an answer is:

1. Concise rule check, for example: “Checking: Does the verb agree with the singular subject team?”
2. Verdict.
3. Targeted hint.
4. Inline retry.
5. Optional **Challenge this result** action.

Progressive hints:

- Hint 1: concept cue without revealing location.
- Hint 2: highlight the relevant phrase/verb.
- Final guidance: explain the correction pattern.

Clause provides concise educational checks and explanations, not long internal model reasoning.

### 10.4 Attempts, scores, and completion

Students receive three attempts per item.

| Outcome | Item score |
| --- | --- |
| Correct on first attempt | 100% |
| Correct after first hint | 75% |
| Correct after second hint | 50% |
| Guided completion | 25% |

A target-rule-correct answer with an unrelated minor issue receives full points plus a small-improvement note. A correction that introduces a new grammar error is partially correct/requires revision.

Score items individually, then normalize to a room total and percentage so 3- and 4-stage rooms remain comparable. During play, show progress and clues, not numeric scores. Results may show score, percentage, badges, mastery badge, completion status, time, first-attempt accuracy, hints, appeal status, error pattern, and skills practised. Teacher marks visibility controls whether numeric marks appear.

Completion statuses:

- Escaped independently
- Escaped with hints
- Completed after guided explanations
- Incomplete / room closed

Guided stages visibly state that their clue was recovered with assistance.

### 10.5 Final lock and Extra Case

Each stage reveals a preassigned, theme-dependent token. Learners enter tokens in stage order into a final lock. Tokens may be digits, letters, or themed symbols; the input remains an ordered sequence. Incorrect lock order receives a gentle correction with no score penalty.

After escape, students can review results, return to My Missions, or attempt an optional Extra Case.

When enabled by the teacher, Extra Case is an optional remediation challenge created after core completion from an observed error pattern. It does not block completion or lower core score. It may add separate bonus points and mastery evidence.

### 10.6 Appeals and network resilience

Students can challenge a free-text verdict and optionally explain why their answer is valid. Appeal review runs in the background, allowing game continuation.

Uncertain AI results receive provisional credit immediately and are labeled as awaiting review. On resolution, accuracy recalculates. Appeals can award or clarify credit but never remove credit already granted.

Teachers see the original item, student response, student explanation, AI verdict/rationale, AI recommendation, accept/deny/override controls, and an optional comment. Students receive a short accepted/rejected outcome message.

If connectivity drops, preserve typed answers locally and show a retry banner. Real rooms show **Awaiting teacher/AI review** after the final attempt if AI grading is unavailable. Demo rooms may use prepared fallback responses.

## 11. Presentation mode

Presentation mode uses the normal player in a large-screen, teacher-controlled shell:

- Larger text and controls.
- No personal/student-result elements.
- Timer visible by default with a simple show/hide control.
- Same attempts, hints, guided explanations, and lock sequence as individual play.
- Records aggregate class-session attempts, hints, scores, time, and error patterns.

It does not require a code, student sign-in, roster, or multiplayer synchronization.

## 12. Teacher dashboard

The default dashboard is **Class Overview**, with active room status prominent. Keep controls within the relevant class dashboard; do not build a separate settings page for MVP.

### Individual student scorecard

Show:

- Total score and percentage
- Completion status
- Time
- First-attempt accuracy
- Hints used
- Appeal status
- Key error pattern

Teachers can inspect raw answers and detailed feedback for incorrect, appealed, and uncertain items. Routine correct answers should not create a wall of AI text. Teachers can manually mark a response correct/incorrect or adjust points; manual changes are labeled as teacher overrides.

### Mastery and insights

Mastery is deterministic and shown by topic, subtopic, and specific error pattern. AI may explain the pattern when available.

| Label | Baseline rule |
| --- | --- |
| Secure | at least 80% first-attempt accuracy for a subtopic |
| Developing | completed with hints/retries or 50–79% first-attempt accuracy |
| Needs Practice | below 50%, guided completions, or unresolved/provisional work |

Dashboard language remains educational. Gameplay language remains theme-specific.

Deterministic dashboard data is immediately available. The AI class insight is created only when a teacher clicks an on-demand button. Class-level prompts use anonymized aggregate events and error labels. Individual AI explanations run only when requested by a teacher.

Retain raw free-text answers, attempts, appeals, and historic data while the class exists. Teachers can explicitly delete learner records. Data export is out of scope.

## 13. AI requirements

All AI calls run server-side and return structured JSON. The frontend must not parse unconstrained prose. Use distinct schemas per operation.

Required AI operations:

1. Room generation: story, stages, rubrics, distractors, hint seeds, clue tokens, difficulty metadata.
2. Edited-stage validation: grammar correctness, safety, grade suitability, answer-key integrity, ambiguity, narrative consistency.
3. Free-text grading: target-rule verdict, concise visible rule check, remaining issue, and uncertainty.
4. Progressive hint generation based on the actual submitted answer.
5. Appeal review with an AI recommendation and rationale.
6. Extra Case generation from a specific error pattern.
7. Teacher insight from aggregate event data.

Free-text grading receives original sentence, target rule, rubric, submitted correction, grade/subtopic context, and teacher-approved alternate answers. It must classify: correct, correct with improvement, partially correct/revise, incorrect, or provisional/uncertain.

The target grammar rule is assessed first. Non-target spelling/punctuation must not fail an answer unless it changes the assessed grammar. Newly introduced grammar errors require revision.

Before demo day, test grading with at least 15–20 fixed cases: clear right/wrong answers, alternate valid corrections, unrelated slips, newly introduced errors, collective nouns, indefinite pronouns, and ambiguous modal/perfect-tense cases. Bias uncertainty toward provisional credit and teacher review.

## 14. Technical architecture

- **App:** Next.js with TypeScript.
- **Styling:** Tailwind CSS.
- **Authentication and database:** Supabase Auth with PostgreSQL and row-level security.
- **Hosting:** Vercel.
- **AI:** secure server-side OpenAI API calls using environment variables only.
- **State:** persisted attempts plus local draft recovery for in-progress answers.

Use deterministic client/server logic for sort/match scoring. Use secure server routes for AI operations, authorization-sensitive changes, and teacher dashboard data.

Core entities:

- users and teacher profiles
- student profiles
- classes
- rooms
- stages and items
- assignments
- attempts and item attempts
- appeals
- class sessions
- teacher insights

Row-level access must ensure teachers can access only their own data and students can access only their own assignments/attempts.

## 15. UX, accessibility, and visual direction

- Support desktop and phones; tablet should work naturally.
- Evidence Sort uses tap-to-assign on phones. Desktop may also offer drag-and-drop. Verify mobile sorting before relying on drag behavior.
- No sound in the MVP.
- Use strong contrast, legible text, and a reduced-motion option/baseline.
- Do not rely on color alone for correctness or progress.
- Motion is subtle: clue reveal, lock opening, progress movement, optional confetti.
- Visual design is UI-led: folders, locks, stamps, tags, panels, and themed icons rather than expensive illustrated scenes.

## 16. Demo and judge experience

The public demo includes:

- Preloaded teacher/class/student sample account.
- Guest **Try sample room** route requiring no account.
- Linked read-only sample teacher dashboard.
- Small non-intrusive checklist: try a wrong answer, challenge a result, inspect teacher insight.
- Prepared wrong-answer and ambiguous-answer paths.
- Clear but unobtrusive **Demo classroom** label.
- Reliable fallback if live AI is unavailable.

Judge priority path:

1. Generate a room.
2. Play a student room.
3. Submit a wrong answer and see rule check/hint.
4. Appeal a result.
5. Inspect teacher dashboard.
6. Edit/revalidate a stage.
7. Run presentation mode.

## 17. Delivery order

1. Scaffold Next.js, Tailwind, Supabase schema/auth, and demo fixtures.
2. Build landing page and teacher dashboard shell.
3. Build teacher wizard and review/validation interface.
4. Build Detective Office player and common theme components.
5. Implement Evidence Sort and Sentence Surgery.
6. Add generation, grading, hints, validation, and appeal routes.
7. Add scoring, results, learner data, analytics, and teacher overrides.
8. Add presentation mode plus light Castle/Sci-Fi variants.
9. Add demo routes, fallback responses, and on-demand insights.
10. Perform mobile, accessibility, and AI grading regression checks; rehearse judge flow.

## 18. Deferred decisions

These do not block implementation:

- Final tagline.
- Final logo and exact color palette.
- Whether Clause is the public name.
- Expanded theme art/illustration direction.
- Public templates, multi-class student membership, and school/admin workflows.

