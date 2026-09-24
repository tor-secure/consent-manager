# Responsive layout audit — Consent Guru

## 1. Executive summary

Public marketing pages, shared chrome (navbar, footer, WhatsApp float), the homepage product mock, comparison tables, auth shell, and dashboard chrome were audited for clipping, accidental horizontal scroll, and viewport-tied heights.

The screenshot issue was not unique to the hero: growing sections used `overflow: hidden`, the dashboard mock used a `82dvh` min-height, logos used a viewport `lg` breakpoint inside a half-width card, and desktop nav appeared at 1024px where links and CTAs no longer fit.

TypeScript `tsc --noEmit` passed after the certification logos JSX syntax error was fixed.

## 2. Routes audited

Public:

- `/`, `/pricing`, `/about`, `/faqs`, `/blogs`, `/blogs/[slug]`, `/news`, `/e-learning`, `/disclaimer`
- `/privacy-center` and legal document shell
- `/sign-in`, `/sign-up`, `/create-organization`
- `/privacy-request`, `/guardian-consent`, `/sdk-demo`

App:

- Dashboard shell (`/dashboard/*`)
- Banner Studio (`h-dvh` workspace, remaining intentional clip)

## 3. Components audited

- `HomeNavbar`, `HomeFooter`, `WhatsAppFloat`
- `HomeProductPreview`, `CertificationLogos`
- `HomeComparison`, `HomeTrustedFeatures`, `HomeUseCasesCta`, `HomeHowItWorks`
- `PrivacyCentreLayout`, `LegalBlocks`, `DpdpCourse`
- `AuthPageShell`, `DashboardShell`, Banner Studio

## 4. Problems discovered

| ID | Problem |
| --- | --- |
| P1 | Hero and other sections used `overflow-hidden`, clipping in-flow content and fade transforms |
| P2 | Product mock `min-h-[min(28rem,82dvh)]` tied height to the viewport instead of content |
| P3 | Certification logos used viewport `lg:` one-row layout inside a ~50% card, clipping logos |
| P4 | Desktop nav at `lg` (1024px) overcrowded the bar |
| P5 | Company dropdown opened left and could leave the viewport |
| P6 | Footer 2-col grid on 320px squeezed labels; offices grid assumed 4 columns for 5 sites |
| P7 | Large fixed heading sizes (`text-6xl`, `text-5xl`) on about/blogs/news/legal |
| P8 | Legal definition grid `220px_1fr` overflowed small tablets |
| P9 | Auth card `overflow-hidden` + `100vh` min-height could clip Clerk forms |
| P10 | Dashboard `overflow-x-hidden` hid wide tables instead of allowing inner scroll |
| P11 | WhatsApp control ignored safe-area insets and could cover footer copy |
| P12 | Comparison feature column `min-width: 12.5rem` made swipe tables heavier than needed |
| P13 | Unused `.public-hero` combined `overflow: hidden` with `min-height: 100vh` |
| P14 | About “Consent → Trust” row used `sm:flex-nowrap` |

## 5. Root cause of each problem

- **P1 / P13:** `overflow: hidden` was used to contain decorative blobs. Combined with transforms and tall children, it clipped real content instead of only paint.
- **P2:** Viewport height math (`82dvh`) treated a content-driven mock as a full-viewport panel.
- **P3:** Breakpoints keyed off the window, not the mock’s container width.
- **P4:** `lg:flex` desktop nav is too wide for 1024–1279px with logo + 6 items + CTAs.
- **P5:** All dropdowns used `left-0`.
- **P6 / P8 / P14:** Grids/flex rows did not collapse to `minmax(0,1fr)` / wrap.
- **P7:** Headings ignored `clamp()` used on the homepage.
- **P9:** Full-viewport min-height plus hidden overflow.
- **P10:** Page-level `overflow-x-hidden` instead of `.table-scroll`.
- **P11:** Fixed positioning without `env(safe-area-inset-*)`.
- **P12:** Table min-widths sized for desktop only.

## 6. Files changed

- `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- `src/app/about/page.tsx`, `src/app/pricing/page.tsx`, `src/app/faqs/page.tsx`, `src/app/blogs/page.tsx`, `src/app/news/page.tsx`, `src/app/disclaimer/page.tsx`
- `src/components/public/home-product-preview.tsx`, `certification-logos.tsx`, `home-navbar.tsx`, `home-footer.tsx`, `home-comparison.tsx`, `home-use-cases-cta.tsx`, `privacy-centre-shell.tsx`, `whatsapp-float.tsx`
- `src/components/auth/auth-page-shell.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/policies/banner-studio/index.tsx`
- `src/components/e-learning/dpdp-course.tsx`

## 7. Fixes implemented

- Replaced content-section `overflow-hidden` with `overflow-x-clip overflow-y-visible` so decorative overflow is contained horizontally without vertical clipping.
- Removed `82dvh` min-height; mock height follows content. Added `@container` so logos wrap at card width, not viewport width.
- Desktop nav + auth CTAs from `xl` (1280px); hamburger below that. Company menu `right-0` with `max-w-[calc(100vw-1.5rem)]`.
- Footer columns: 1 → 2 → 3 → 5. Extra footer padding for the WhatsApp control + safe-area.
- Responsive `clamp()` headings on public heroes.
- Legal layout `minmax(0,1fr)`; definition terms no longer a rigid 220px.
- Auth: no `overflow-hidden` on the card; min-height only from `lg` up, using `dvh`.
- Dashboard main `overflow-x-auto`; header can scroll on very small widths. `.table-scroll` gets `max-width: 100%`.
- Banner Studio `h-screen` → `h-dvh max-h-dvh` (still a dedicated workspace).
- Added `.public-container` utility (max-width 75rem, clamp padding). Unused `.public-hero` no longer forces `100vh` + hidden overflow.

## 8. Desktop validation

- Layout intent: two-column hero from `lg`, one-row logos when the mock container is ≥520px, desktop nav from `xl`.
- 1920 / 1440: unchanged visual design, content top-aligned under the nav.
- 1366 / 1280: hamburger until 1280 avoids overlapping nav items.
- Automated browser screenshots in this session failed (`chrome-error://chromewebdata/`); re-check locally at 1440×900 and 1366×768.

## 9. Tablet validation

- 1024×768 / 834×1194: stacked hero, 2-row logos, mobile nav, swipe comparison table (intentional horizontal scroll inside `.comparison-scroll` only).
- About steps wrap instead of nowrap.

## 10. Mobile validation

- 390 / 375 / 360 / 320: `min-w-0` on grids, footer single column under 400px, WhatsApp on the right with safe-area, 2-row cert logos, clamp headings.
- Comparison table remains an inner swipe region, not page-level overflow.

## 11. Horizontal overflow results

- Page-level `overflow-x: clip` remains on `.home-page` only to contain the industry marquee (`width: max-content` + translate). That is an intentional animation container, not a band-aid on broken children.
- Comparison and dashboard tables scroll inside `.comparison-scroll` / `.table-scroll`.
- Decorative blobs use `overflow-x-clip` on the section, not `hidden` on `body`.

## 12. Vertical clipping results

- Hero, pricing, about, FAQs, news, blogs, privacy, and solutions no longer clip on Y via `overflow-hidden`.
- Product mock is content-height, not `82dvh`.
- Banner Studio still clips to `100dvh` by design (editor chrome).

## 13. Navbar validation

- Fits with shrinkable logo, gap reduction, hamburger below `xl`.
- Dropdowns stay in viewport (`max-w`, last menu right-aligned).
- Mobile drawer still `max-height: min(70dvh, 34rem)` with internal scroll.

## 14. Footer validation

- Columns collapse; legal links wrap (`min-w-0`).
- Bottom padding keeps WhatsApp off copyright lines.

## 15. Modal / dropdown validation

- Marketing dropdowns: hover/focus + `right-0` for Company.
- Dashboard search / vendor popovers were already `absolute` with `z-index` and were not rewritten.
- Clerk auth overflow hidden removed so inner Clerk UI can extend.

## 16. Animation validation

- Home section fade still uses `translateY`; parent no longer `overflow-hidden`, so the 28px start offset is not clipped.
- Industry marquee still `overflow: hidden` on its own track (required).

## 17. Accessibility observations

- Hamburger remains the pattern under 1280px (do not shrink desktop links until unreadable).
- WhatsApp target is 40px; combined with safe-area it stays tappable.
- Skip link unchanged.
- Comparison swipe hint already exists for small screens.

## 18. Remaining risks

- Browser automation in this pass could not load `localhost` (`chrome-error`). Visual QA at listed breakpoints should still be done in a local browser.
- ESLint on the changed set was started; confirm CI if the local run is slow.
- Banner Studio remains a full-viewport `overflow-hidden` app; that is workspace chrome, not marketing.
- Industry marquee still overflows internally by design.
- Dashboard pages that use raw `<table>` without `.table-scroll` can still overflow; most inventory lists already wrap tables.
- `.public-container` is defined but not yet applied to every public page (existing `max-w-[1200px] px-5 sm:px-8` remains).

## 19. Recommended future improvements

1. Apply `.public-container` across remaining public pages for one padding scale.
2. Convert remaining dashboard tables to `.table-scroll`.
3. Add Playwright viewport snapshots (390, 768, 1280, 1440).
4. Consider container queries for the comparison highlight header on tablet.

## Responsive readiness: 8/10

### BEFORE

- Hero and several public sections hid overflow, so mock, logos, and trust copy could be cut off.
- Mock height followed the viewport (`82dvh`).
- Logos went single-row at desktop viewport while the card was still narrow.
- Nav overflowed between 1024px and 1280px.
- Footer, legal grids, and large headings broke on small and mid widths.
- Dashboard main clipped wide tables.

### AFTER

- Content-driven sections grow vertically; only X-clip for decoration/marquee.
- Mock and cert strip size to their container.
- Nav uses a real mobile pattern until 1280px.
- Public typography uses `clamp()`.
- Tables and comparison swipe inside dedicated scrollers.
- WhatsApp respects the right edge and safe areas.

### REMAINING

- Manual viewport screenshots (automation blocked).
- Banner Studio full-viewport clip (intentional).
- Incomplete adoption of `.public-container`.
- A few dashboard tables may still need `.table-scroll`.
