# UI/UX Implementation Notes

This document records the MVP interaction work added after the initial Clause prototype. It follows the UI/UX Specification Companion while keeping data local until authentication, persistence, and AI routes are introduced.

## What changed

- Replaced the broad prototype landing screen with a focused header, equal-weight sample/create actions, and three concise product proof points.
- Added a five-step, back-navigable teacher room wizard: learning setup, theme, explicit generation, review, and publish.
- Added review-stage selection, validation status, editable draft fields, and teacher actions for editing, regenerating, testing, and duplicating a stage.
- Rebuilt the sample player around a progress rail, timer, stage gating, clue-token tray, in-place feedback, retry hints, and inline appeals.
- Added deterministic interactions for Sentence Surgery, Evidence Sort, and Case File Rewrite, followed by an ordered-token final lock and completion view.
- Expanded the teacher dashboard with an on-demand class insight, appeal filter, mastery labels, and expandable student rows.
- Updated the visual system to use a neutral productivity-app base with a Detective Office navy/amber accent and reusable status styling.

## Shared interaction patterns

The current implementation keeps these patterns co-located in `src/app/page.tsx` so the demo remains easy to run:

- `StageProgressRail`: tracks completed stages and recovered tokens.
- `FeedbackPanel`: presents rule check, status, hint, retry context, and inline challenge flow.
- `FinalLock`: accepts the recovered token sequence without a score penalty for a wrong order.
- Teacher review and dashboard rows use expandable local state to demonstrate the intended future data model.

## Deliberate MVP limits

- No sign-in, class persistence, student roster, or share-link backend exists yet.
- Generation and AI grading are deterministic local fallbacks; server-side structured evaluation should replace them.
- Timer and answers are client-only, so connectivity recovery and resumed attempts are not yet persisted.
- Theme selection changes room metadata in the demo; a future theme-token layer should apply the companion palette and icon sets throughout the player.

## Repository hygiene

- Local environment files, development logs, Next.js build output, Turbopack cache files, ESLint cache files, and editor swap files are excluded through `.gitignore`.
- The implementation includes small comments only for non-obvious MVP boundaries: local-only navigation state, deterministic classification, and fallback answer grading.

## Verification

- `npm run lint` passes.
- `npm run build` passes and renders the root route as a static page.
- The local Next.js development server responds with HTTP 200 at `http://127.0.0.1:3000`.
- Browser screenshot automation was attempted but could not initialize because the local browser runtime was denied access to an app-data path. This does not affect the app build or local HTTP smoke test.

## Suggested next technical work

1. Split player, wizard, feedback, lock, and dashboard components into `src/components`.
2. Add database tables and authentication for teachers, classes, rooms, attempts, and appeals.
3. Add schema-validated server routes for generation and semantic grading with prepared demo fallbacks.
4. Persist timer, answers, and retry state locally and server-side.
5. Add automated interaction tests for stage unlocks, feedback order, appeals, and final-lock token order.
