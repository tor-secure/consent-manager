# ConsentFlow UI/UX Audit

**Date:** 11 September 2026  
**Scope:** Public site, auth, SDK demo, public utility pages, and dashboard (source + rendered public routes).  
**Method:** Code inspection of Next.js 16 app routes, layouts, tokens, and components; live HTTP checks against `http://localhost:3000`. In-editor browser automation was unavailable. `/dashboard` returns **307** (Clerk) and was audited from source, not a signed-in session.

---

## 1. Executive Summary

ConsentFlow is a working CMP: Next.js 16, Clerk, Drizzle, Tailwind v4, Geist, and a real dashboard design system (`--primary: #2c4a7c`, `.btn`, `Card`, `EmptyState`, `PageHeader`). Recent get-live work already connected website → policy → publish → install.

The product **looks designed**. The remaining gap is **trust and consistency**, not empty chrome.

**UX quality:** Strong operator path on paper; still uneven empty states, competing primaries, and setup-mode nav that hides Vendors/Install.  
**UI quality:** Dashboard tokens are coherent. The public site is a second brand (indigo `#5850EC`) with leftover marketing claims that the product cannot back.

**Biggest problems**

1. Unsubstantiated trust: fake customer logos, “thousands of businesses,” “14-day free trial,” “no credit card,” “99.99% uptime.”
2. Two (sometimes three) brand colors: marketing indigo, dashboard navy, Clerk `#4F46E5`.
3. A consent product with **no Terms/Privacy pages** and unlabeled public token forms.
4. Accessibility: no skip links; mobile menu remains tabbable when closed; settings labels not tied to inputs.
5. Dashboard CTA collisions (published policy: Install + Banner Studio both primary).

**Biggest strengths**

- Clear homepage promise in under five seconds (“Build trust. Collect consent. Stay compliant.”).
- Honest pricing disclaimer (“Billing is not enabled”).
- Get Live strip, setup checklist, website next-action chips, and shared `EmptyState` on core pages.
- Dashboard tokens, focus rings on `.btn`, and `prefers-reduced-motion` in `globals.css`.
- Publish/compliance gates are real — do not weaken them.

**Overall:** A credible B2B CMP with a split personality. Fix honesty and accessibility first. Do not start another visual rebrand.

---

## 2. Current Design Analysis

### Architecture

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Auth | Clerk (`SignIn`, `SignUp`, `CreateOrganization`) |
| Data | Drizzle + Neon/Postgres |
| Styling | Tailwind v4 via `@import "tailwindcss"`; tokens in `src/app/globals.css` |
| Fonts | Geist Sans + Geist Mono (`src/app/layout.tsx`) |
| Icons | Inline SVG only (no icon library) |
| UI kit | Local: `Button`, `Card`, `EmptyState`, `Field`, `StatCard`, `Badge`, `Alert` |
| State | Server components + Clerk + `useAsyncAction` + toasts |
| Forms | Mix of `Field`/`FormCard` and local unlabeled wrappers |
| Breakpoints | `sm` 640, `md` 768, `lg` 1024, `xl` 1280; public nav collapses at `lg` |

### Two visual dialects

**Dashboard / auth chrome:** Navy `#2c4a7c`, teal success `#0f766e`, 12–16px radius, `card-shadow`, page titles at 1.5–1.625rem.

**Marketing homepage:** Indigo `#5850EC`, gradient headline, logo marquee, 2.35–3.4rem hero, decorative grid.

**SDK demo / privacy-request / guardian-consent:** Tailwind `slate` + `indigo-600` — a third dialect.

Unused public utility classes (`.public-page`, `.public-container`) already exist in CSS but the homepage ignores them.

### Information architecture

Public: Hero → Features (+ fake logos) → How it works → Use cases → Pricing → Newsletter band → Footer.

Dashboard: 40+ routes in 7 nav groups. Setup mode keeps Dashboard, Websites, Policies, Purposes, SDK, Analytics; everything else folds into **More tools**.

---

## 3. Page-by-Page Findings

### Public homepage `/` — rendered 200

**Good:** One H1, real nav destinations, How it works + display-only pricing, strong primary CTA to `/sign-up`, secondary to `/sdk-demo`.  
**Wrong:** Fake logos (Airbnb, Microsoft, etc.), trial/credit-card claims, `#9CA3AF` hero meta contrast, newsletter headline vs “create a workspace” CTA.  
**Change:** Honest trust line; drop fabricated social proof; align claims with “no billing yet.”  
**Priority:** CRITICAL (trust), HIGH (contrast).

### Sign-in / Sign-up / Create org — rendered 200

**Good:** Shared `AuthPageShell`; dark mode forced off for contrast; create-org matches sign-in chrome.  
**Wrong:** Clerk primary overridden to `#4F46E5` in CSS while shell uses `#2c4a7c`; no Terms/Privacy; likely two H1s (marketing panel + Clerk title); no `<main>` / skip link; “99.99% uptime” claim.  
**Change:** Unify button color; add skip + main; remove unverified SLA; do **not** invent legal pages.  
**Priority:** HIGH.

### SDK demo `/sdk-demo` — rendered 200

**Good:** Slim Home + Sign up bar; harness is still a test tool.  
**Wrong:** Third palette; `alert()` errors; no site footer.  
**Change:** Keep harness. Do not turn it into a landing page.  
**Priority:** LOW (keep as-is except later error UI).

### Privacy request `/privacy-request` and Guardian `/guardian-consent` — rendered 200

**Good:** Honest copy about what the token does.  
**Wrong:** Orphaned (no chrome), unlabeled inputs, `indigo-600` buttons, raw JSON dump.  
**Change:** Labels, `aria-pressed` on mode toggle, live region for results.  
**Priority:** CRITICAL (a11y on public legal-adjacent forms).

### Dashboard home (source; live 307)

**Good:** Get Live, dismissible setup, next-step language.  
**Wrong:** Three different “complete” definitions (layout vs SetupGuide vs compliance card); Setup button hidden on xs.  
**Change:** One completion rule; show Setup on mobile.  
**Priority:** HIGH.

### Websites / Policies / Consent / Scanner / Developers

**Good:** Next-action chips; Review & publish; Install after publish; SDK table with last verify.  
**Wrong:** Published policy: two primary buttons; some empties still bare text (transfers, developers).  
**Change:** One primary per view; shared EmptyState.  
**Priority:** HIGH.

### Settings / Monitoring / Intelligence

**Good:** Shared `NeedsWebsiteEmpty` / scan / install empties on several tools.  
**Wrong:** Org/website settings labels not associated; monitoring filters unlabeled; many routes lack `loading.tsx`.  
**Change:** `htmlFor`/`id`, `aria-label` on filters.  
**Priority:** HIGH (labels), MEDIUM (skeletons).

### 404 / checkout

No `not-found.tsx`. No Stripe/checkout — pricing is display-only (correct).

---

## 4. UX Issues

| Problem | Location | Severity | Why it matters | Recommended solution | Impact | Effort |
| ------- | -------- | -------- | -------------- | -------------------- | ------ | ------ |
| Fake customer logos and “thousands” | `home-trusted-features.tsx`, `home-use-cases-cta.tsx` | CRITICAL | A CMP that fabricates social proof is not trustworthy | Remove logos; replace with product-true copy | HIGH | LOW |
| Trial / no-card / cancel claims | `page.tsx`, `home-use-cases-cta.tsx` | CRITICAL | Pricing page says billing is off | Replace with “Free workspace — billing not enabled” | HIGH | LOW |
| Newsletter headline vs signup CTA | `home-footer.tsx` | HIGH | Users expect email capture that does not exist | Headline = create a workspace | MEDIUM | LOW |
| Competing primaries when published | `policies/[id]/page.tsx` | HIGH | Unclear next step after publish | Studio stays outline; Install is the only primary | HIGH | LOW |
| Setup “complete” defined three ways | `get-live-path.ts`, `home-sections.tsx` | HIGH | Operators cannot tell if they are done | One rule: website + published + first consent | HIGH | MEDIUM |
| Vendors/Install buried in setup nav | `navigation.ts` | HIGH | Get Live asks for vendors; nav hides them | Keep Vendors in setup set or chip to it | MEDIUM | LOW |
| Bare empties (transfers, developers) | `transfers/page.tsx`, `developers/page.tsx` | MEDIUM | Dead end vs other pages | Use `EmptyState` + href | MEDIUM | LOW |
| Org onboarding checkbox unused | `organization-settings-form.tsx` | MEDIUM | Competes with Get Live | Hide or bind to real progress | LOW | LOW |
| SDK demo `alert()` | `sdk-demo/page.tsx` | MEDIUM | Blocks and is inaccessible | Inline error, later | LOW | LOW |
| No 404 page | `src/app` | LOW | Generic Next fallback | Add branded `not-found.tsx` | LOW | LOW |

---

## 5. UI Issues

| Problem | Location | Severity | Why it matters | Recommended solution | Impact | Effort |
| ------- | -------- | -------- | -------------- | -------------------- | ------ | ------ |
| Dual brand (indigo vs navy) | Homepage vs dashboard/`--primary` | HIGH | Product feels like two apps | Keep navy as system; marketing can keep indigo **or** adopt navy — do not invent a third | MEDIUM | HIGH |
| Clerk CSS forces `#4F46E5` | `globals.css` `.cl-formButtonPrimary` | HIGH | Auth button ≠ shell links | Match `#2c4a7c` | MEDIUM | LOW |
| `btn` vs `Button` vs raw buttons | Publish, monitoring, settings | MEDIUM | Uneven height/focus | Prefer `.btn` / `Button` | MEDIUM | MEDIUM |
| `HoverGlassCard` only on websites | `website-list.tsx` | LOW | One-off texture | Keep; do not spread glass | LOW | — |
| Hero meta `#9CA3AF` | `page.tsx` | MEDIUM | Fails WCAG AA | Use `#4B5563` / `#6B7280` | MEDIUM | LOW |
| Unused `.public-*` classes | `globals.css` | LOW | Drift | Use later or delete | LOW | LOW |
| Mobile drawer says “Consent / Manager” | `dashboard-shell.tsx` | MEDIUM | Brand mismatch | “ConsentFlow” | LOW | LOW |

---

## 6. Mobile Issues

| Problem | Location | Severity | Why it matters | Recommended solution | Impact | Effort |
| ------- | -------- | -------- | -------------- | -------------------- | ------ | ------ |
| Closed mobile nav still in tab order | `home-navbar.tsx` | HIGH | Keyboard users hit invisible links | `inert` / `hidden` when closed | HIGH | LOW |
| Dashboard hamburger: no focus ring; `aria-controls` points at desktop aside | `dashboard-shell.tsx` | HIGH | Screen readers / keyboard | Ring + `id` on mobile drawer | HIGH | LOW |
| Setup reopen hidden on xs | `setup-guide.tsx` | HIGH | Cannot restore checklist on phone | Show button at all sizes | MEDIUM | LOW |
| Org name `max-w-[7.5rem]` | dashboard layout | MEDIUM | Unreadable workspace name | Tooltip + slightly wider | MEDIUM | LOW |
| Header crowding (search + 5 icons) | `dashboard-shell.tsx` | MEDIUM | Overflow / tiny targets | Keep search icon-only on xs (already); 44px targets | MEDIUM | MEDIUM |
| Wide tables (consent, vendors, monitoring) | various | MEDIUM | Horizontal scroll with no sticky first column | Keep scroll; add captions later | MEDIUM | MEDIUM |
| Use-case 2-col grid at 11px | `home-use-cases-cta.tsx` | LOW | Dense on 320px | Single column below `sm` | LOW | LOW |
| Create-website aside hidden until `lg` | `create-page-header.tsx` | MEDIUM | Mobile misses install hint | Show compact hint on mobile | MEDIUM | LOW |

---

## 7. Accessibility Issues

| Problem | Location | Severity | Why it matters | Recommended solution | Impact | Effort |
| ------- | -------- | -------- | -------------- | -------------------- | ------ | ------ |
| No skip link | Public, auth, dashboard | HIGH | Keyboard users traverse full nav every time | Skip to `#main-content` | HIGH | LOW |
| Unlabeled token inputs | `privacy-request`, `guardian-consent` | CRITICAL | Public forms for rights/guardian | Visible `<label>` + `htmlFor` | HIGH | LOW |
| Settings labels not associated | `organization-settings-form.tsx`, `website-settings-form.tsx` | HIGH | Clicking label does not focus field | `htmlFor` + `id` | HIGH | LOW |
| Monitoring selects unlabeled | `monitoring/page.tsx` | HIGH | Filters announced as “combo box” only | `aria-label` | HIGH | LOW |
| Search inputs placeholder-only | websites, purposes, vendors | MEDIUM | Placeholder is not a name | `sr-only` label | MEDIUM | LOW |
| Sidebar `aria-label` = description | `sidebar-nav.tsx` | MEDIUM | SR hears “Visitor consent records” not “Consent” | Use visible title | MEDIUM | LOW |
| Collapsed sidebar tooltips hover-only | `sidebar-nav.tsx` | MEDIUM | Keyboard users get no name context | Title on focus | MEDIUM | LOW |
| No focus trap on mobile drawer | `dashboard-shell.tsx` | MEDIUM | Focus escapes overlay | Trap or return focus on close | MEDIUM | MEDIUM |
| `EmptyState` title is `<p>` | `empty-state.tsx` | LOW | Weak document outline | Use `h2` | LOW | LOW |
| Auth probable double H1 | `auth-page-shell.tsx` | MEDIUM | Confusing outline | Marketing title as `p`/`h2` | MEDIUM | LOW |
| No Terms/Privacy | Auth footer | HIGH | Legal + trust for a CMP | Publish real pages later; do not invent copy now | HIGH | HIGH |
| `#9CA3AF` on white | Homepage | HIGH | Contrast ~2.5:1 | Darker gray | MEDIUM | LOW |

---

## 8. Conversion Issues

| Problem | Location | Severity | Why it matters | Recommended solution | Impact | Effort |
| ------- | -------- | -------- | -------------- | -------------------- | ------ | ------ |
| Hero promises a trial the product does not run | `page.tsx` | CRITICAL | Bounce when signup is just “free workspace” | Align hero with pricing disclaimer | HIGH | LOW |
| Growth “Talk to us” is not a contact path | `home-pricing.tsx` | MEDIUM | Enterprise dead end | Same `/sign-up` or remove phrase | MEDIUM | LOW |
| Everything is `/sign-up` | Public CTAs | LOW | Fine for now; no sales form | Keep until billing exists | LOW | — |
| Auth missing legal consent | Auth shell | HIGH | Operators notice; counsel will | Real legal pages when written | HIGH | HIGH |
| Public DSAR/guardian pages unlinked | Footer | MEDIUM | Data subjects cannot find them | Footer links once chrome exists | MEDIUM | LOW |
| Fake logos | Features | CRITICAL | Compliance buyers verify claims | Remove | HIGH | LOW |

---

## Inspection notes (cannot access)

| Route | Status | Note |
| --- | --- | --- |
| `/dashboard` and all dashboard children | 307 → Clerk | Audited from source only |
| Checkout / Stripe | N/A | Not implemented (correct) |
| In-editor browser | Unavailable | Used HTTP + source |

---

## KEEP

Do **not** redesign these:

- Dashboard token set (`--primary` navy, teal success, rose danger).
- `.btn` / `PageHeader` / `Card` / `EmptyState` / `StatusBanner` pattern.
- Get Live strip + dismiss/reopen (one wizard, not a second).
- Website next-action chips.
- Policy publish validators and blocker list.
- Banner Studio chrome and live/draft distinction.
- Homepage section order (hero → features → how it works → use cases → pricing).
- `/sdk-demo` as a test harness.
- Display-only pricing with “billing not enabled.”
- `prefers-reduced-motion` rules.
- Geist fonts.

---

## MUST / SHOULD / OPTIONAL

### MUST CHANGE (this pass)

Honesty + blocking a11y: fake trust, trial claims, newsletter mismatch, skip links, public form labels, mobile tab trap, hamburger a11y, settings/`htmlFor`, monitoring labels, dual primary on published policy, Clerk button color, contrast on hero gray, Setup on mobile, shared empties for transfers/developers.

### SHOULD CHANGE (later)

Unify public indigo with navy; loading skeletons on remaining routes; table captions; focus trap; sidebar `aria-label`; create-website mobile aside; one setup-complete definition; 404 page; footer links to DSAR/guardian.

### OPTIONAL

Glass cards elsewhere, motion polish, FAQ, sales form, full typography scale on marketing, sticky table columns.

---

## Final scorecard (current)

| Dimension | Score | Why |
| --- | ---: | --- |
| UX | 6.5/10 | Path exists; honesty and leftover empties hurt |
| UI | 7/10 | Dashboard system is good; public is a second brand |
| Navigation | 7/10 | Public nav is truthful; setup mode hides needed steps |
| Visual hierarchy | 7/10 | Hero and Get Live are clear; policy header competes |
| Mobile UX | 5.5/10 | Tables and header crowding; tab trap; Setup hidden |
| Accessibility | 5/10 | Tokens help; labels/skip/legal/contrast fail |
| Conversion | 5.5/10 | CTA is obvious; claims are false |
| Consistency | 5/10 | Three palettes; two button systems |
| Performance UX | 7/10 | Streaming home + some skeletons; many routes lack `loading.tsx` |
| **Overall** | **6/10** | Ship-ready CMP that still talks like a generic SaaS landing page |

---

## TOP 15 RECOMMENDED CHANGES

1. **Remove fabricated social proof** — Features marquee + “thousands” — Why: trust. Benefit: honest CMP. Difficulty: Low.
2. **Align hero/CTA claims with no billing** — Homepage + use-cases band. Difficulty: Low.
3. **Label public token forms** — `/privacy-request`, `/guardian-consent`. Difficulty: Low.
4. **Skip links + `#main-content`** — Home, auth, dashboard. Difficulty: Low.
5. **Close mobile nav to keyboard** — `home-navbar.tsx`. Difficulty: Low.
6. **Fix dashboard hamburger a11y + brand** — `dashboard-shell.tsx`. Difficulty: Low.
7. **Associate settings labels** — Org + website settings. Difficulty: Low.
8. **Label monitoring filters** — `monitoring/page.tsx`. Difficulty: Low.
9. **One primary on published policy** — Studio outline. Difficulty: Low.
10. **Align Clerk button to navy** — `globals.css`. Difficulty: Low.
11. **Fix `#9CA3AF` contrast** — Hero. Difficulty: Low.
12. **Show Setup on mobile** — `setup-guide.tsx`. Difficulty: Low.
13. **EmptyState for transfers + developers** — Difficulty: Low.
14. **One setup-complete definition** — `get-live-path` vs home cards. Difficulty: Medium.
15. **Publish real Terms/Privacy** — Do not invent them in this pass. Difficulty: High (legal).
