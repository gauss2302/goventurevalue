# Havamind Design System

*Human Interface Guidelines for Havamind — Professional, Exciting, Built for Founders (18–25).*

---

## Brand Attributes

- **Personality:** Professional for founders
- **Primary emotion:** Excitement
- **Target audience:** 18–25

---

# 1. FOUNDATIONS

## 1.1 Color System

### Primary palette (6 colors)

| Name | Hex | RGB | HSL | On white (contrast) | On dark #1c1e2f (contrast) | Use |
|------|-----|-----|-----|---------------------|----------------------------|-----|
| **Primary** | `#4f46ba` | 79, 70, 186 | 244°, 45%, 50% | 4.6:1 (AA large) | 5.2:1 (AA) | Primary actions, links, key UI |
| **Secondary** | `#f9896b` | 249, 137, 107 | 12°, 92%, 70% | 2.8:1 (fail body) | 6.8:1 (AA) | Secondary actions, highlights |
| **Accent** | `#fdbc64` | 253, 188, 100 | 36°, 98%, 69% | 2.2:1 (fail body) | 8.1:1 (AAA) | CTAs, badges, emphasis |
| **Ice** | `#84e8f4` | 132, 232, 244 | 186°, 82%, 74% | 1.8:1 (fail) | 9.2:1 (AAA) | Decorative, charts, light BG only |
| **Ink** | `#1c1e2f` | 28, 30, 47 | 234°, 25%, 15% | 14.2:1 (AAA) | — | Primary text on light |
| **Muted** | `#707a89` | 112, 122, 137 | 216°, 10%, 49% | 4.6:1 (AA) | 4.5:1 (AA) | Secondary text, captions |

**Accessibility:** Use Primary, Ink, and Muted for text on white. Use Secondary, Accent, and Ice for text on Ink/dark backgrounds or as large non-text elements.

### Semantic colors

| Role | Light (hex) | Dark (hex) | On light BG contrast | On dark BG contrast |
|------|-------------|------------|------------------------|---------------------|
| **Success** | `#0d9488` | `#2dd4bf` | 4.5:1 (AA) | 5.5:1 (AA) |
| **Warning** | `#d97706` | `#fbbf24` | 4.5:1 (AA) | 6.2:1 (AA) |
| **Error** | `#dc2626` | `#f87171` | 4.5:1 (AA) | 5.1:1 (AA) |
| **Info** | `#2563eb` | `#60a5fa` | 4.5:1 (AA) | 5.8:1 (AA) |

Semantic foregrounds: white on Success/Error in both themes; black or dark on Warning/Info in light, white in dark when needed for contrast.

### Dark mode equivalents

- **Primary:** `#7c6ee8` (lighter tint on dark BG). Contrast on `#1c1e2f`: ~5.5:1 (AA).
- **Secondary:** `#fc9d82`. Contrast on dark: ~5.8:1.
- **Accent:** `#fdd088`. Contrast on dark: ~8.5:1.
- **Ice:** `#9eecf2`. Contrast on dark: ~10:1.
- **Ink:** Use as dark surface; text use `#fafafa` (foreground).
- **Muted:** `#9ca3af` in dark. Contrast on dark BG: ~4.5:1.

### Color usage rules

- **Primary:** One primary action per screen; primary buttons; active nav; links.
- **Secondary:** Secondary buttons; complementary highlights; supporting visuals.
- **Accent:** Urgency, CTAs, badges, “new” or “pro” labels.
- **Ice:** Charts, illustrations, hero accents; never body text on white.
- **Ink:** Body and heading text on light backgrounds.
- **Muted:** Captions, placeholders, disabled text, metadata.
- **Semantic:** Success = confirmations/saved state; Warning = caution/optional; Error = validation/destructive; Info = tips/neutral status.

---

## 1.2 Typography

### Font families

- **Display / Headlines:** Sora (weights 400–800). Use for hero, H1–H3.
- **Body / UI:** Manrope (weights 300–800). Use for body, labels, buttons, UI.
- **Script (decorative only):** Caveat (500–700). Use sparingly for quotes or marketing flair, never for body or critical UI.

### Type scale (9 levels)

Sizes are given for **desktop (1440)** / **tablet (768)** / **mobile (375)**. Line-height and letter-spacing are shared unless noted.

| Level | Desktop | Tablet | Mobile | Line height | Letter spacing | Weight | Font |
|-------|---------|--------|--------|-------------|----------------|--------|------|
| Display | 56px | 48px | 40px | 1.1 | -0.02em | 700 | Sora |
| Headline | 40px | 36px | 32px | 1.15 | -0.015em | 600–700 | Sora |
| Title 1 | 32px | 28px | 26px | 1.2 | -0.01em | 600 | Sora |
| Title 2 | 24px | 22px | 20px | 1.25 | 0 | 600 | Sora |
| Title 3 | 20px | 18px | 18px | 1.3 | 0 | 600 | Manrope/Sora |
| Body | 16px | 16px | 16px | 1.5 | 0 | 400 | Manrope |
| Callout | 15px | 15px | 15px | 1.45 | 0 | 500 | Manrope |
| Subheadline | 14px | 14px | 14px | 1.4 | 0 | 500 | Manrope |
| Footnote | 13px | 13px | 13px | 1.35 | 0 | 400 | Manrope |
| Caption 1 | 12px | 12px | 12px | 1.3 | 0.01em | 400 | Manrope |
| Caption 2 | 11px | 11px | 11px | 1.25 | 0.02em | 400 | Manrope |

### Font pairing strategy

- **Headlines (Display → Title 3):** Sora for clarity and excitement.
- **Body and UI (Body → Caption):** Manrope for readability and warmth.
- **Consistency:** One Sora weight per section (e.g. 700 for Display, 600 for Headline); one Manrope weight per component (e.g. 500 for labels, 400 for body).

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

- **Anatomy:** Container, logo/brand, nav list, footer slot (optional).
- **Specs:** Width expanded 288px (18rem), collapsed 80px (5rem). Item height 40px, padding 12px 16px. Active: background `--surface-muted`, left border 3px `--brand-primary`.
- **States:** Expanded, collapsed; item default/hover/active.
- **Usage:** App-level navigation when 5+ destinations.
- **A11y:** `aria-label="Sidebar"`, `nav`, focus trap when open on mobile.

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
9. **Do** use Sora for headlines and Manrope for body. **Don't** mix many weights in one block.
10. **Do** test contrast (AA minimum for text). **Don't** use Ice or light accent on white for body text.

## 4.3 Implementation guide for developers

- **Tokens:** Use CSS variables from `src/styles.css` (e.g. `var(--brand-primary)`, `var(--space-4)`). Theme tokens are in `@theme inline` for Tailwind (e.g. `bg-background`, `text-muted-foreground`).
- **Adding components:** Prefer shadcn/ui: `pnpm dlx shadcn@latest add <component>`. Place in `src/components/ui/`; extend with brand variants (e.g. `variant="brand"` on Button) via `cva`.
- **Extending the system:** Add new tokens under `:root` and `.dark`, then to `@theme inline` if Tailwind should expose them. Document new components in this doc (anatomy, states, a11y, specs).
- **Accessibility:** Every interactive component must be keyboard-focusable, have visible focus, and use ARIA as specified in component sections. Run axe or similar in CI.

---

*Havamind Design System v1.0 — Human Interface Guidelines.*
