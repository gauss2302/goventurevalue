# Havamind Design System

*Human Interface Guidelines for Havamind — Editorial Capital: confident, warm, data-forward finance for founders.*

---

## Brand Attributes

- **Aesthetic:** Editorial Capital — editorial finance that is confident, warm, and data-forward, avoiding the generic purple-gradient SaaS look.
- **Personality:** Professional and trustworthy for founders.
- **Primary emotion:** Confident momentum.
- **Target audience:** Early-stage founders preparing investor-ready material.

---

# 1. FOUNDATIONS

## 1.1 Color System

### Primary palette (Editorial Capital)

Runtime source of truth: `src/styles.css` (`:root`). Machine-readable catalog: `docs/tokens.json`.

| Name | Hex | CSS variable | Use |
|------|-----|--------------|-----|
| **Primary (teal)** | `#0d9488` | `--brand-primary` | Primary actions, links, active nav, focus rings |
| **Primary hover** | `#0f766e` | `--brand-primary-hover` | Hover/pressed state for primary surfaces |
| **Primary muted** | `#cffafe` | `--brand-primary-muted` | Tints for active nav, badges, icon medallions |
| **Secondary (coral)** | `#e85d4c` | `--brand-secondary` | Secondary actions, supporting chart series |
| **Accent (amber)** | `#f59e0b` | `--brand-accent` | CTAs, KPI highlights, "pro" badges |
| **Ink** | `#0c1222` | `--brand-ink` | Primary text on light; deep navy-black |
| **Muted** | `#5f5b52` | `--brand-muted` | Secondary text, captions, placeholders |

### Surfaces & atmosphere

| Name | Hex | CSS variable | Use |
|------|-----|--------------|-----|
| **Page** | `#f8f6f1` | `--page` | Warm paper page background |
| **Surface** | `#ffffff` | `--surface` | Cards, sheets, raised surfaces |
| **Surface muted** | `#f1efe8` | `--surface-muted` | Inset/secondary surfaces, table headers |
| **Border soft** | `#e7e3d8` | `--border-soft` | Hairline borders, dividers |

Depth comes from a subtle grain overlay (`.grain-overlay`) and radial mesh accents (`.bg-mesh-accent`), plus soft shadows — not flat white.

**Accessibility:** Use Primary, Ink, and Muted for text on paper/white. Use Accent and Secondary as large non-text elements or on dark surfaces; pair amber backgrounds with a dark ink foreground for AA contrast.

### Semantic colors

| Role | Light (hex) | Dark (hex) | On light BG contrast | On dark BG contrast |
|------|-------------|------------|------------------------|---------------------|
| **Success** | `#0d9488` | `#2dd4bf` | 4.5:1 (AA) | 5.5:1 (AA) |
| **Warning** | `#d97706` | `#fbbf24` | 4.5:1 (AA) | 6.2:1 (AA) |
| **Error** | `#dc2626` | `#f87171` | 4.5:1 (AA) | 5.1:1 (AA) |
| **Info** | `#2563eb` | `#60a5fa` | 4.5:1 (AA) | 5.8:1 (AA) |

Semantic foregrounds: white on Success/Error in both themes; black or dark on Warning/Info in light, white in dark when needed for contrast.

### Dark mode

Dark mode is implemented via the `.dark` class (tokens in `src/styles.css`). Key shifts: page/ink invert to deep navy `#0c1222` surfaces with warm paper text `#f8f6f1`; primary lightens to teal `#2dd4bf`; semantic colors lighten for contrast (success `#2dd4bf`, warning `#fbbf24`, error `#f87171`).

### Color usage rules

- **Primary:** One primary action per screen; primary buttons; active nav; links; focus rings.
- **Secondary:** Secondary buttons; complementary highlights; supporting chart series.
- **Accent:** Urgency, CTAs, KPI highlights, “new” or “pro” labels.
- **Ink:** Body and heading text on light backgrounds.
- **Muted:** Captions, placeholders, disabled text, metadata.
- **Charts/data:** Use the `--chart-1`…`--chart-5` ramp for series; sequential heatmaps (e.g. cohort retention) may use a dedicated scale and are exempt from the brand-token rule.
- **Semantic:** Success = confirmations/saved state; Warning = caution/optional; Error = validation/destructive; Info = tips/neutral status.

---

## 1.2 Typography

### Font families

- **Display / Headlines:** Syne (weights 400–800), `var(--font-display)`. Geometric, memorable headlines. Apply via the `font-display` utility or the typography primitives in `src/components/ui/typography.tsx` — never the broken `font-[var(--font-display)]` arbitrary utility.
- **Body / UI:** Figtree (weights 300–800), `var(--font-sans)`. Friendly and legible at data density. This is the default body font.

### Type scale

Sizes are exposed as CSS variables (`--text-display`, `--text-title1`, …) and consumed via the typography primitives (`DisplayHeading`, `PageTitle`, `SectionTitle`, `SubTitle`, `Eyebrow`, `Lead`, `Muted`). Prefer these primitives over arbitrary Tailwind sizes.

| Level | Font | Typical use |
|-------|------|-------------|
| Display | Syne 700–800 | Hero / marketing headlines |
| Title 1 | Syne 700 | Page titles (`PageTitle`) |
| Title 2 | Syne 600–700 | Section titles (`SectionTitle`) |
| Title 3 | Syne 600 | Card titles (`CardTitle`, `SubTitle`) |
| Body | Figtree 400 | Default body copy |
| Callout / Subheadline | Figtree 500 | Labels, list rows, dense UI |
| Footnote / Caption | Figtree 400 | Metadata, captions, eyebrows |

### Font pairing strategy

- **Headlines:** Syne for confident, editorial headlines (700–800 for Display, 600–700 for titles).
- **Body and UI:** Figtree for readability and warmth across body, labels, and buttons.
- **Consistency:** One Syne weight per heading level; one Figtree weight per component (e.g. 500 for labels, 400 for body).

### Accessibility

- **Minimum body size:** 16px (no smaller for main content).
- **Minimum caption:** 12px (Caption 1); Caption 2 only for non-essential labels.
- **Line height:** Minimum 1.3 for body; 1.2 for headings.
- **Weight:** Avoid below 400 for body text.

---

## 1.3 Layout grid

- **Desktop:** 12 columns, max-width 1440px, content max 1200px centered.
- **Tablet:** 12 columns, viewport 768px.
- **Mobile:** 12 columns, viewport 375px (or 390 for notched).

### Gutters and margins

| Breakpoint | Gutter | Margin (sides) | Columns |
|------------|--------|----------------|---------|
| Desktop (≥1200px) | 24px | 24px | 12 |
| Tablet (768–1199px) | 16px | 16px | 12 |
| Mobile (&lt;768px) | 16px | 16px | 12 |

### Breakpoint definitions

- `mobile`: 0–767px
- `tablet`: 768px–1199px
- `desktop`: 1200px–1439px
- `wide`: 1440px+

### Safe areas

- Respect `env(safe-area-inset-top/bottom/left/right)` for notched devices.
- Minimum tap target 44×44px; keep primary actions outside bottom safe area on mobile.

---

## 1.4 Spacing system

Base unit: **8px**. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

| Token | Value | Usage |
|-------|--------|--------|
| space-1 | 4px | Inline gaps (icon–label), tight lists |
| space-2 | 8px | Compact padding, small gaps |
| space-3 | 12px | Input padding, list item spacing |
| space-4 | 16px | Default padding, form fields |
| space-5 | 24px | Section spacing, card padding |
| space-6 | 32px | Between sections |
| space-7 | 48px | Between regions |
| space-8 | 64px | Page sections |
| space-9 | 96px | Hero / large sections |
| space-10 | 128px | Major page divisions |

---

# 2. COMPONENTS

## 2.1 Navigation

### Header

- **Anatomy:** Container, logo, nav links (optional), right slot (e.g. Auth).
- **Specs:** Height 64px (desktop), 56px (mobile). Padding horizontal 24px (desktop), 16px (mobile). Border-bottom 1px solid `--border`. Background `--surface`.
- **States:** Default; sticky (shadow `--card-shadow` when scrolled).
- **Usage:** Global app chrome; one primary nav level.
- **A11y:** `role="banner"`, `nav` with `aria-label="Main"`, skip link to main content.

### Tab bar

- **Anatomy:** Container, tab items (label + optional icon).
- **Specs:** Height 48px. Tab padding 12px 16px. Active: bottom border 2px `--brand-primary`, font-weight 600.
- **States:** Default, hover (background `--surface-muted`), active, disabled.
- **Usage:** Switch between 2–5 sibling views; not for primary nav.
- **A11y:** `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`; arrow keys; focus ring.

### Sidebar

- **Anatomy:** Container, brand mark ("H" in Syne), nav list, footer slot (optional).
- **Specs:** Width expanded 16rem (`--sidebar-expanded-width`), collapsed 4.5rem (`--sidebar-collapsed-width`); the live width is published as `--sidebar-width` so the shell offset stays in sync. Item min-height 40px. Active: animated sliding pill on `--sidebar-active-bg` with `--sidebar-active-fg` text.
- **States:** Expanded, collapsed (persisted to `localStorage`); item default/hover/active.
- **Usage:** App-level navigation; rendered through `AppShell`. On mobile it becomes a shadcn `Sheet` drawer with a hamburger trigger.
- **A11y:** `aria-label`, `nav`, `aria-current` on active item; Sheet provides focus trap and `SheetTitle` on mobile; respects reduced motion for the active-pill animation.

### Breadcrumbs

- **Anatomy:** Container, separator (chevron or slash), links + current page (non-link).
- **Specs:** Font Footnote; link color `--muted-foreground`, hover `--foreground`; current `--foreground` font-weight 500.
- **States:** Default, hover on links.
- **Usage:** Deep hierarchy (e.g. Dashboard > Models > Edit); 2–4 levels.
- **A11y:** `nav aria-label="Breadcrumb"`, `ol`/`li`, current item not a link; separators hidden from screen readers.

---

## 2.2 Input

### Button (6 variants)

- **Anatomy:** Label, optional icon (left/right), optional loading spinner.
- **Variants:** Primary (brand), Secondary (outline), Ghost, Destructive, Link, Tertiary (muted fill).
- **Specs:** Height default 36px, sm 32px, lg 40px. Padding horizontal 16px (default), 12px (sm), 24px (lg). Border-radius `--radius` (e.g. 10px). Focus: ring 2px `--ring` offset 2px.
- **States:** Default, hover, active (slight scale/press), focus-visible, disabled (opacity 0.5, no pointer-events), loading (spinner, disabled).
- **Usage:** Primary = one main action; Secondary = cancel/alternative; Destructive = delete/remove; Link = low emphasis.
- **A11y:** `button` or `role="button"`; `aria-busy` when loading; `aria-disabled`; visible focus.

### Text field

- **Anatomy:** Label (optional), input, placeholder, helper/error text, optional leading/trailing icon.
- **Specs:** Height 40px. Padding 10px 12px. Border 1px `--input`, radius `--radius-sm`. Font Body.
- **States:** Default, hover (border darker), focus (ring 2px `--ring`), disabled (opacity 0.6), error (border `--destructive`, error message below).
- **Usage:** Single-line text; pair with label and helper/error.
- **A11y:** `<label>` or `aria-label`; `aria-invalid` and `aria-describedby` for error; `autocomplete` where appropriate.

### Textarea

- **Anatomy:** Label, textarea, helper/error. Min height 80px.
- **Specs:** Padding 12px. Same border/radius/focus as text field.
- **States:** Same as text field.
- **A11y:** Same as text field; avoid `resize: none` if content can be long.

### Dropdown / Select

- **Anatomy:** Trigger (selected value or placeholder), chevron, listbox (options).
- **Specs:** Trigger height 40px, padding 10px 36px 10px 12px. Listbox max-height 280px, option height 36px.
- **States:** Closed, open (listbox visible), hover/focus option, disabled trigger, error (border).
- **Usage:** 5+ options; single selection.
- **A11y:** `role="combobox"`, `aria-expanded`, `aria-controls`, `listbox`/`option`; arrow keys, Enter to select, Esc to close.

### Toggle

- **Anatomy:** Track, thumb. Track width 44px, height 24px; thumb 20px, offset 2px.
- **Specs:** Track radius 12px; thumb radius 50%. Off: track `--input`; On: track `--brand-primary`.
- **States:** Off, on, hover, focus (ring), disabled.
- **Usage:** Binary setting (on/off).
- **A11y:** `role="switch"`, `aria-checked`; label; keyboard toggle (Space).

### Checkbox

- **Anatomy:** Box (16×16px), checkmark. Border 2px, radius 4px.
- **States:** Unchecked, checked, indeterminate, hover, focus, disabled.
- **Usage:** Multiple selection; optional items.
- **A11y:** `role="checkbox"`, `aria-checked` (true/false/mixed); associated label.

### Radio button

- **Anatomy:** Circle 18px, inner dot when selected (8px).
- **States:** Unselected, selected, hover, focus, disabled.
- **Usage:** Single selection from 2–6 options.
- **A11y:** `role="radio"`, `aria-checked`; same `name` in group; `role="radiogroup"`, `aria-label` on group.

### Slider

- **Anatomy:** Track, thumb. Track height 4px, thumb 20×20px.
- **Specs:** Track radius 2px; thumb radius 50%; color `--brand-primary`.
- **States:** Default, hover, focus (ring), disabled.
- **Usage:** Numeric range (e.g. 0–100).
- **A11y:** `role="slider"`, `aria-valuemin/max/now`, `aria-valuetext` if needed; arrow keys.

### Search field

- **Anatomy:** Magnifier icon (leading), input, optional clear (trailing).
- **Specs:** Same as text field; padding-left 40px for icon.
- **States:** Empty, filled, focus; clear visible when non-empty.
- **A11y:** `aria-label="Search"` or visible label; `type="search"`; clear button labeled.

### Date picker

- **Anatomy:** Trigger (input or button showing date), calendar popover (grid, month/year controls).
- **Specs:** Trigger as text field; popover min-width 280px, day cell ~36px.
- **States:** Closed, open; today highlighted; selected date; disabled dates.
- **A11y:** `role="button"` or input; `aria-haspopup="dialog"`; calendar with `grid`, `aria-selected`; arrow keys.

---

## 2.3 Feedback

### Alert

- **Anatomy:** Icon (optional), title, description, optional action.
- **Variants:** Success, warning, error, info. Border-left 4px semantic color; background tint.
- **Specs:** Padding 16px; radius `--radius`; gap 12px.
- **Usage:** Inline page feedback; persistent until dismissed or context changes.
- **A11y:** `role="alert"` or `role="status"`; icon decorative or `aria-hidden`; ensure contrast.

### Toast

- **Anatomy:** Icon, message, optional action/close.
- **Specs:** Min-width 300px, max-width 400px; padding 16px; radius `--radius-lg`; shadow `--card-shadow-hover`.
- **States:** Enter (slide + fade), idle, dismiss (fade out).
- **Usage:** Non-blocking confirmation or short message; auto-dismiss or close.
- **A11y:** `role="status"` or `role="alert"`; `aria-live="polite"` or `assertive`; focus not trapped.

### Modal / Dialog

- **Anatomy:** Overlay, container, title, content, footer (actions).
- **Specs:** Overlay 80% black; container max-width 480px (form) or 560px (content); padding 24px; radius `--radius-xl`.
- **States:** Closed, open (focus inside); escape and click-outside to close when allowed.
- **Usage:** Critical choices; forms that need focus.
- **A11y:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby`; focus trap; Esc to close; return focus on close.

### Progress indicator

- **Linear:** Track height 8px, radius 4px; fill `--brand-primary`; percentage or indeterminate animation.
- **Circular:** Stroke width 4px; same color.
- **States:** Determinate (value), indeterminate (animation).
- **A11y:** `role="progressbar"`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax` or `aria-valuetext="Loading"` for indeterminate.

### Skeleton screen

- **Anatomy:** Placeholder blocks matching content layout (text lines, avatars, cards).
- **Specs:** Background `--muted`; border-radius matching content; shimmer or pulse animation.
- **Usage:** Initial load; avoid for instant content.
- **A11y:** `aria-busy="true"` on region; `aria-live="polite"`; avoid long static text in skeleton.

---

## 2.4 Data display

### Card

- **Anatomy:** Container, optional header (title, action), content, optional footer.
- **Specs:** Padding 24px; radius `--card-radius` (24px); border 1px `--border-soft`; shadow `--card-shadow`; hover `--card-shadow-hover`.
- **States:** Default, hover (optional lift/shadow).
- **Usage:** Group related content; dashboard widgets, list items.
- **A11y:** Prefer semantic section/article; heading hierarchy; interactive cards keyboard-focusable.

### Table

- **Anatomy:** Table, thead, tbody, th, td; optional caption, sort indicators.
- **Specs:** Cell padding 12px 16px; header font Callout; border-bottom 1px `--border`.
- **States:** Default; row hover (background `--surface-muted`); sortable header focus.
- **Usage:** Tabular data; avoid for layout-only.
- **A11y:** `<table>`, `<th scope="col">`, caption; sortable: `aria-sort`; striped rows optional.

### List

- **Anatomy:** Container, list items (optional icon, title, description, action).
- **Specs:** Item padding 12px 16px; gap or divider between items.
- **States:** Default, hover, selected (background tint).
- **Usage:** Repeating items (e.g. models, decks); prefer list over table when not tabular.
- **A11y:** `ul`/`ol` or `role="list"`; interactive items focusable.

### Stat card

- **Anatomy:** Label, value (number or short text), optional trend (delta + icon).
- **Specs:** Value font Title 2 or Headline; label Footnote; padding 20px; radius `--radius-lg`.
- **Usage:** KPIs, summaries; dashboard top-level metrics.
- **A11y:** Label associated; trend read by screen reader (e.g. “+12% vs last month”).

### Badge

- **Anatomy:** Label only; optional dot or icon.
- **Variants:** Default (muted), primary, success, warning, error.
- **Specs:** Height 20–24px; padding 4px 8px; radius 6px; font Caption 1.
- **Usage:** Counts, status, tags; keep short.
- **A11y:** Decorative or `aria-label` if meaning not in text.

### Tooltip

- **Anatomy:** Trigger, popover (short text).
- **Specs:** Max-width 240px; padding 8px 12px; font Footnote; radius `--radius-sm`; delay ~200ms.
- **States:** Hidden, visible on hover/focus.
- **Usage:** Clarify icon or truncated text; not for critical info only in tooltip.
- **A11y:** `aria-describedby` linking to tooltip; show on focus (keyboard); dismiss on Esc.

---

## 2.5 Media

### Avatar

- **Anatomy:** Container (circle or rounded square), image or initials.
- **Sizes:** 24, 32, 40, 48, 64px.
- **Specs:** Radius 50%; background `--muted`; font Callout or Subheadline for initials; object-fit cover.
- **Usage:** User identity; avoid for non-person entities.
- **A11y:** `alt=""` if decorative; otherwise descriptive alt or initials + `aria-label`.

### Image container

- **Anatomy:** Wrapper (aspect ratio), img, optional caption/overlay.
- **Specs:** Radius `--radius-lg`; overflow hidden; optional object-fit (cover/contain).
- **Usage:** Screenshots, illustrations; set width/height or aspect-ratio to avoid layout shift.
- **A11y:** Meaningful `alt`; caption in figcaption if needed.

### Icon

- **Anatomy:** SVG or icon font; single semantic meaning.
- **Sizes:** 16, 20, 24px (default). Stroke 1.5–2px; consistent with Lucide.
- **Usage:** Actions, status, categories; pair with label when action.
- **A11y:** Decorative: `aria-hidden`; standalone action: visible label or `aria-label`.

---

## 2.6 Composite

### Empty state

- **Anatomy:** Icon or illustration, title (Title 3), description (Body), primary action (optional).
- **Specs:** Vertical padding 48px+; center-aligned; max-width 360px.
- **Usage:** No data yet; onboarding step; explain and offer next action.
- **A11y:** Heading for region; CTA focusable.

### Form group

- **Anatomy:** Label, helper text (optional), input(s), error message (optional).
- **Specs:** Gap 8px between label and input; 4px between input and error; error in semantic color.
- **Usage:** Every form field; one group per logical field.
- **A11y:** `label` for id; `aria-describedby` for helper + error; `aria-invalid` when error.

---

# 3. PATTERNS

## 3.1 Page templates

- **Landing:** Hero (Display + CTA), value props (cards or sections), social proof, footer; full-width sections with max-width content; primary emotion (excitement) in hero.
- **Dashboard:** Sidebar + main; main = stats row + 2-col or list; cards for widgets; primary action visible.
- **Settings:** Vertical list of sections (e.g. Profile, Billing); each section card or grouped fields; save/cancel at section or page level.
- **Profile:** Avatar, name, bio/fields; edit mode vs view; consistent with Settings.
- **Auth (signin/signup):** Centered card (max 400px); logo, title, form, secondary link (e.g. sign up / sign in); no sidebar.

## 3.2 User flows

- **Onboarding:** Short steps (1–3 screens); progress indicator; skip optional; primary CTA per step.
- **Authentication:** Sign in → (optional) redirect; Sign up → verify → redirect; OAuth callback → redirect; errors inline with recovery link.
- **Search:** Query input + filters (optional) + results; loading skeleton; empty state when no results; clear filters CTA.
- **Empty states:** Use Empty state component; one primary action; optional secondary (e.g. “Learn more”).

## 3.3 Feedback patterns

- **Success:** Toast or inline alert; brief message; optional “Undo” when applicable.
- **Error:** Inline (field-level or form-level) + message; recovery action (retry, fix field); avoid toast-only for blocking errors.
- **Loading:** Skeleton for content; spinner for buttons or local action; disable duplicate submit.
- **Empty:** Empty state pattern; no generic “No data” without explanation or next step.

---

# 4. DOCUMENTATION

## 4.1 Design principles

1. **Clarity** — One primary action per screen; clear hierarchy (Display → Body → Caption); labels on every control; error messages that explain and suggest fix.
2. **Efficiency** — Short flows (e.g. 3-step onboarding); defaults that match majority use; keyboard and focus order; consistent placement (e.g. primary button right/bottom).
3. **Delight** — Subtle motion (hover, focus, page transition); confident color (brand primary + accent); empty states and success feedback that feel human.

## 4.2 Do's and Don'ts

1. **Do** use one primary button per view. **Don't** use multiple same-weight CTAs that compete.
2. **Do** use the 8px spacing scale. **Don't** use arbitrary values (e.g. 13px, 19px).
3. **Do** pair labels with every input. **Don't** rely on placeholder as the only label.
4. **Do** use semantic colors for status (success/warning/error). **Don't** use brand primary for errors.
5. **Do** keep body text ≥16px. **Don't** use Caption 2 for long copy.
6. **Do** provide focus rings for keyboard users. **Don't** remove outline without a visible focus style.
7. **Do** use empty states with explanation and action. **Don't** leave blank areas with no guidance.
8. **Do** use loading skeletons for content-heavy areas. **Don't** use spinners for full-page load only.
9. **Do** use Syne for headlines and Figtree for body. **Don't** mix many weights in one block, and never use the broken `font-[var(--font-display)]` utility — use the `font-display` class or typography primitives.
10. **Do** test contrast (AA minimum for text). **Don't** use light amber/accent on paper for body text; pair amber surfaces with dark ink.

## 4.3 Implementation guide for developers

- **Tokens:** Use CSS variables from `src/styles.css` (e.g. `var(--brand-primary)`, `var(--space-4)`). Theme tokens are in `@theme inline` for Tailwind (e.g. `bg-background`, `text-muted-foreground`). Avoid hardcoded hex in route/component classNames — the only exceptions are chart/data colors and third-party brand logos.
- **Layout:** Authenticated pages are composed from `src/components/layout/` — `AppShell` (sidebar + offset), `PageContainer` (max-width, padding, grain/mesh), `PageHeader` (eyebrow + title + description + actions), plus `EmptyState`, `LoadingState`, and `ErrorState`. The dashboard uses the sticky `DashboardHeader`.
- **Typography & motion:** Use the primitives in `src/components/ui/typography.tsx` and the shared variants in `src/lib/motion.ts` (`pageVariants`, `staggerContainer`, `fadeUpItem`) via `useReducedMotionSafe`/`usePageMotion`.
- **Adding components:** Prefer shadcn/ui: `pnpm dlx shadcn@latest add <component>`. Place in `src/components/ui/`; extend with brand variants (e.g. `variant="brand"`/`variant="accent"` on Button, status variants on Badge) via `cva`.
- **Extending the system:** Add new tokens under `:root` and `.dark`, then to `@theme inline` if Tailwind should expose them. Keep `docs/tokens.json` in sync, and document new components in this doc (anatomy, states, a11y, specs).
- **Accessibility:** Every interactive component must be keyboard-focusable, have visible focus, and use ARIA as specified in component sections. Reduced motion is honored globally and via `useReducedMotionSafe`; coarse-pointer touch targets are enforced to 44×44px in `src/styles.css`.

---

*Havamind Design System v2.0 — Editorial Capital.*
