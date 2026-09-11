# ConsentFlow UI/UX Redesign Plan

This plan follows the audit in `UI_UX_AUDIT.md`. It is **not** a brand overhaul. The dashboard already has a usable system. Marketing needs honesty and one fewer palette over time. Implementation in this cycle is **MUST CHANGE only**.

---

## Design Philosophy

ConsentFlow should feel like a **compliance operations tool**, not a generic AI SaaS splash.

- **Truth over theater.** Every claim must be true in this codebase today.
- **One next step.** Each screen has one primary action.
- **Reuse the dashboard system.** Navy, teal, rose, `.btn`, `Card`, `EmptyState`.
- **Marketing can stay indigo** for now if we do not add a third color. Unify later (SHOULD).
- **Usability over trends.** No extra glass, gradients, or motion.

Desired experience: a prospect understands the product in five seconds; a new operator publishes and opens the install snippet in a few minutes; a returning operator finds 40+ tools without losing the live path.

---

## Color System

**Keep (dashboard — source of truth)**

| Token | Hex | Use |
| --- | --- | --- |
| `--primary` | `#2c4a7c` | Buttons, links, focus ring |
| `--primary-hover` | `#243e68` | Hover |
| `--foreground` | `#122033` | Text |
| `--muted-foreground` | `#5b6b80` | Secondary text (borderline AA — prefer 14px+) |
| `--success` / `--accent` | `#0f766e` | Success, positive |
| `--warning` | `#b45309` | Warnings |
| `--danger` | `#be123c` | Errors |
| `--background` | `#f3f5f8` | App canvas |
| `--card` | `#ffffff` | Surfaces |
| `--border` | `#d9e0ea` | Hairlines |

**Marketing (existing — do not expand)**

| Hex | Use |
| --- | --- |
| `#5850EC` | Homepage CTAs (keep until a dedicated brand pass) |
| `#111827` | Marketing body |
| `#4B5563` / `#6B7280` | Secondary (not `#9CA3AF` for text) |

**Change now**

- Clerk overrides: `#4F46E5` → `#2c4a7c`.
- Hero meta: `#9CA3AF` → `#6B7280`.
- Do not introduce new accent colors.

---

## Typography

Keep Geist Sans / Geist Mono.

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Marketing H1 | 2.35rem → 3.4rem (lg) | 700 | 1.08–1.15 |
| Marketing H2 | 1.875–2.25rem | 700 | 1.2 |
| Dashboard page title | 1.5–1.625rem | 600 | 1.2 |
| H3 / card title | 1rem–1.125rem | 600 | 1.35 |
| Body | 0.875–1rem | 400 | 1.5–1.6 |
| Small / meta | 0.75–0.8125rem | 500 | 1.4 |
| Buttons | 0.875rem | 500–600 | 1 |

Do not enlarge marketing type further.

---

## Spacing

Reuse existing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48.  
`.page-wrap` already steps padding at 480 / 768 / 1280. Keep it.

---

## Components

| Component | Direction |
| --- | --- |
| Navbar (public) | Keep items. Inert closed mobile menu. Skip link above. |
| Navbar (dashboard) | 44px hamburger, correct `aria-controls`, ConsentFlow wordmark in drawer. |
| Buttons | One primary per cluster. Prefer `.btn` / `Button`. |
| Cards | Keep `Card` + `card-shadow`. Do not spread `HoverGlassCard`. |
| Forms | Shared `Field` with `htmlFor`. Visible errors via `Alert`. |
| Inputs | `.field-input`; never placeholder-only. |
| Tables | Keep `.table-scroll`. Add captions later (SHOULD). |
| Modals | Mobile drawer: return focus; trap later. |
| Alerts | `StatusBanner` / `Alert` — not raw red divs. |
| Footer | Real links only. Newsletter = workspace CTA. |
| CTAs | Public primary: Get started / Create workspace. Secondary: SDK demo. |
| EmptyState | Title as `h2`; always a next href when a step is missing. |

---

## Animation

**Animate:** 180–220ms color/opacity; Get Live checkmarks; toast; reduced-motion already kills this.

**Do not animate:** Layout width except sidebar; marketing parallax; new marquees.

**Micro-interactions worth keeping:** Button `translateY(-1px)` on hover; focus rings; loading on `Button`.

---

## Page redesign (structure only)

### Homepage

**Current:** Hero → Features (+ fake logos) → How it works → Use cases → Pricing → Newsletter → Footer.

**Problems:** Fake trust; trial claims; newsletter lie.

**Recommended (this cycle):** Same order. Replace logo row with a single honest line. Hero trust pills = product-true. Newsletter heading = create workspace.

Do **not** add FAQ/social-proof blocks until there is real content.

### Auth

**Current:** Split marketing + Clerk.

**Recommended:** Keep shell. Skip + `<main>`. Navy buttons. Drop 99.99% claim. No invented Terms.

### SDK demo

**Keep current structure.** Harness stays a harness.

### Privacy request / Guardian

**Current:** Bare form.

**Recommended now:** Labels + live region. Later (SHOULD): public chrome + footer links.

### Dashboard home

**Current:** Stats + Get Live + charts.

**Recommended:** Keep. One `isSetupComplete`. Setup visible on mobile.

### Policy detail

**Current:** Review & publish **or** Install + Studio (sometimes two primaries).

**Recommended:** Unpublished: Review & publish primary, Studio outline. Published: Install primary, Studio outline.

### Developers / Transfers

**Recommended:** Same pages; `EmptyState` instead of a sentence.

### Settings / Monitoring

**Recommended:** Same layout; associated labels.

---

## Prioritized implementation plan

### Phase 1 — Critical fixes (this pass)

Honesty, skip links, labels, mobile tab order, hamburger, Clerk color, contrast, dual primary, Setup on mobile, two empty states.

### Phase 2 — UX improvements

Single setup-complete rule; Vendors in setup nav; table captions; 404; footer → DSAR pages.

### Phase 3 — Visual redesign (optional later)

Adopt navy on marketing **or** document indigo as a campaign color. Delete unused `.public-*` or actually use them. One button primitive.

### Phase 4 — Mobile & accessibility

Focus trap, 44px targets, sticky first table column, create-form mobile aside.

### Phase 5 — Polish

Inline SDK errors, auth heading outline, motion only where it confirms a save.

---

## MUST / SHOULD / OPTIONAL (implementation gate)

**MUST:** Listed in Phase 1 — implemented after this document.

**SHOULD:** Phase 2–4. Do not block shipping MUST.

**OPTIONAL:** Phase 5 and any new marketing sections.

Do not rewrite App Router, Clerk, or publish validators.
