# Design

## Theme

Two distinct environments serving different contexts:

- **Teacher & Marketing** — light mode. Clean, credible, professional. Pure white surfaces let the amber brand accent do all the work.
- **Gameplay** — dark mode. Theatrical and immersive. A warm near-black stage where per-theme colors shine like set lighting.

Physical scene (gameplay): a student at a desk after school, the room dim around them, amber lamplight pooling on the puzzle. Everything else fades to shadow.

## Color

Base palette in OKLCH. Tokens replace the existing teal/warm-cream system.

### Light (teacher, marketing, default)

| Role | OKLCH | Usage |
|---|---|---|
| bg | `oklch(1 0 0)` | Pure white page background |
| surface | `oklch(0.97 0.006 75)` | Cards, panels, sections |
| surface-2 | `oklch(0.94 0.01 75)` | Hover, secondary surfaces |
| border | `oklch(0.88 0.012 70)` | Borders, dividers |
| ink | `oklch(0.15 0.02 55)` | Body text |
| ink-secondary | `oklch(0.45 0.03 55)` | Secondary text, labels |
| ink-muted | `oklch(0.62 0.025 55)` | Placeholders, disabled |
| primary | `oklch(0.68 0.16 80)` | Amber brand — buttons, links, active states |
| primary-hover | `oklch(0.62 0.18 80)` | Amber hover |
| primary-glow | `oklch(0.75 0.10 80 / 0.15)` | Glow, backdrops |
| accent | `oklch(0.48 0.18 260)` | Deep indigo — badges, secondary brand cues |
| accent-hover | `oklch(0.42 0.20 260)` | Indigo hover |
| success | `oklch(0.62 0.16 150)` | Correct, complete |
| warning | `oklch(0.72 0.16 85)` | Hint, revise |
| error | `oklch(0.55 0.20 30)` | Wrong, error |
| gold | `oklch(0.70 0.18 85)` | Tokens, rewards, earned state |

### Dark (gameplay shell)

| Role | OKLCH | Usage |
|---|---|---|
| bg | `oklch(0.08 0.008 55)` | Near-black warm — the theater |
| surface | `oklch(0.14 0.012 55)` | Panels on dark |
| surface-2 | `oklch(0.18 0.015 55)` | Hover on dark |
| border | `oklch(0.22 0.015 55 / 0.5)` | |
| ink | `oklch(0.92 0.01 65)` | Warm off-white body |
| ink-secondary | `oklch(0.65 0.02 60)` | |
| ink-muted | `oklch(0.45 0.015 60)` | |
| primary | `oklch(0.78 0.16 80)` | Brighter amber for dark — glows |
| primary-hover | `oklch(0.72 0.18 80)` | |
| primary-glow | `oklch(0.78 0.16 80 / 0.12)` | |
| accent | `oklch(0.60 0.16 260)` | |
| accent-hover | `oklch(0.55 0.18 260)` | |
| success | `oklch(0.65 0.14 150)` | |
| warning | `oklch(0.75 0.14 85)` | |
| error | `oklch(0.60 0.18 30)` | |
| gold | `oklch(0.78 0.18 85)` | |

### Per-theme accent system

Each game room overrides the accent color to create its own world. The base shell (bg, surface, ink, primary) stays consistent; the theme swaps accent and gold.

| Theme | Accent | Gold |
|---|---|---|
| Detective | `oklch(0.65 0.18 55)` — warm ochre | `oklch(0.70 0.18 85)` — amber |
| Castle | `oklch(0.55 0.20 290)` — violet | `oklch(0.72 0.16 290)` — amethyst |
| Sci-Fi | `oklch(0.65 0.14 210)` — cyan | `oklch(0.75 0.12 180)` — teal |

Each theme also overrides `--theme-glow` for ambient backdrops and `--theme-bg` for a tinted surface shift. The theme system uses CSS custom property overrides scoped to `.theme-{name}` as already structured.

### Text-on-color

White text on all saturated fills (primary, accent, success, gold) regardless of WCAG pass. Saturated colors perceptually glow brighter than their luminance — dark text on amber reads muddy.

### Contrast

Body ink vs bg: 7+:1 in both modes. Secondary ink: 3.5+:1.

## Typography

Two-family contrast: a characterful serif for display, a clean sans for body.

### Display headings (`h1`–`h3`)

**GT Alpina** (or equivalent warm-condensed serif: Literata, Source Serif 4). Used in hero, mission titles, lock screens, teacher dashboard headers. `text-wrap: balance`. Clamp max 4.5rem for headings, 6rem for hero display.

### Body, UI, labels

**Inter** (system fallback: Segoe UI, SF Pro). Already the project font — preserved. `text-wrap: pretty` on long prose.

| Scale | Size | Weight |
|---|---|---|
| hero | `clamp(2.5rem, 5vw, 5rem)` | 800–900 |
| h2 | `clamp(1.5rem, 3vw, 2.25rem)` | 700–800 |
| h3 | `clamp(1.125rem, 2vw, 1.5rem)` | 700 |
| body | 0.875rem–1rem | 400–500 |
| small | 0.75rem–0.8125rem | 500–600 |
| badge | 0.6875rem | 700 uppercase |

Line length capped at 65–75ch on prose.

## Spacing & Layout

- **Base unit**: 4px. Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 100, 120.
- **Gameplay shell**: max-width 1080px centered. Sidebar evidence locker at 280px.
- **Teacher dashboard**: max-width 800px centered. Metric grid `repeat(auto-fit, minmax(160px, 1fr))`.
- **Landing**: full-bleed hero, 960px content sections, 680px CTA.
- **Breakpoints**: 640px (compact), 768px (mobile nav), 1024px+ (full layout).

### Z-index scale

| Layer | Value |
|---|---|
| dropdown | 10 |
| sticky header | 50 |
| modal backdrop | 60 |
| modal | 70 |
| toast | 80 |
| tooltip | 90 |

No arbitrary values. No 999.

## Motion

Medium-high energy with purpose.

### Principles

- Entrances use `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out quart). No bounce, no elastic.
- Layout properties never animate. Transform + opacity only.
- Staggered reveals for lists (50–100ms delay per item).
- Reduced motion: all animations degrade to instant or `opacity 0.15s` crossfade via `@media (prefers-reduced-motion: reduce)`.

### Timeline

| Event | Style |
|---|---|
| Page/section enter | `translateY(20px) + opacity` over 0.6–0.8s, staggered |
| Stage transition | Screen dims to `rgba(0,0,0,0.6)`, new stage scales in `scale(0.95 → 1)` + `opacity` over 0.5s |
| Token earn | Scale pop `scale(1 → 1.25 → 1)` over 0.4s, amber glow flash |
| Correct answer | Green pulse on border, checkmark draw-in 0.3s |
| Revise / hint | Gentle amber wiggle on border, hint slides in from right |
| Lock reveal | Slots flip in sequence (0.15s stagger), final burst of confetti |
| Button hover | `translateY(-1px)` + subtle shadow deepen over 0.2s |
| Button press | `scale(0.96)` over 0.1s |

### Ambient

- Hero: floating shapes with gentle vertical drift (8–12s loops).
- Gameplay: subtle amber glow pulse on primary elements (4s loop).
- Progress rail: current step has a gentle breathing pulse.

## Components

Reusable patterns replacing the current utility-only approach.

### Button

Rounded-pill (`border-radius: 999px`). Three variants:
- **Primary**: amber fill, white bold text, hover lift + shadow
- **Secondary**: surface bg, border, ink text
- **Ghost**: transparent, ink-secondary, hover surface-2

Sizes: default (10px 24px, 14px), sm (7px 18px, 13px). All use `display: inline-flex; align-items: center; gap: 6px`.

### Card

Standard container: `border: 1px solid var(--border)`, `border-radius: var(--radius)`, `background: var(--surface)`, `padding: 24px`. Three sizes: default, sm (16px), lg (28px). Card nesting is always wrong.

### Input

Standard: border, radius-sm, surface bg, 10px 14px padding, 14px font. Focus ring: `0 0 0 3px primary-glow`.

### Feedback panel

Three states: correct (green border + light green bg), revise (amber border + light amber bg), appeal (accent border + light accent bg). Each with icon + label + hint text.

### Progress rail

Horizontal step track. Each step has a rounded-square marker and label. States: default (border, muted), current (primary border + glow), done (success fill).

### Evidence locker

Sidebar container (280px) with token chips. Token: capsule shape, dashed border, earned style with solid gold border + amber tint.

### Lock screen

Centered layout with 3-column slot grid, token chips below.

## Theming system

Room themes follow the existing class-scoped override pattern (`.theme-detective`, `.theme-castle`, `.theme-scifi`) but with the new palette values. Each theme overrides:
- `--theme-accent` — secondary brand color
- `--theme-gold` — token/reward color
- `--theme-glow` — ambient glow color
- `--theme-bg` / `--theme-surface` / `--theme-border` — tinted surface shift
- Emoji prefix on agent notes

Stage types within a room (Sentence Surgery, Evidence Sort, Case File Rewrite) share the room's theme but get distinct icons and feedback styling via sub-class.
