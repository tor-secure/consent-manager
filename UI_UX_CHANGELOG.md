# UI/UX changelog

**Date:** 11 September 2026  
**Scope:** MUST CHANGE items from `UI_UX_AUDIT.md` / `UI_UX_REDESIGN_PLAN.md` only. No palette pass, no new marketing sections, no invented Terms/Privacy pages.

## What changed

### Honesty (public site)

- Removed fabricated customer logos (Airbnb, Microsoft, and others) and “trusted by / thousands” copy.
- Replaced “14-day free trial,” “no credit card,” and “cancel anytime” with claims that match this product: free workspace, billing not enabled, SDK demo, publish + install.
- Newsletter band heading now asks people to create a workspace instead of implying a mailing list.

### Accessibility

- Added a skip link and `#main-content` (or `#auth-form`) on the homepage, auth shell, dashboard, privacy-request, and guardian-consent pages.
- Public token forms now have visible labels, `aria-pressed` on the privacy-request mode toggle, and an `aria-live` result region.
- Homepage mobile nav uses `hidden` when closed so links are not in the tab order.
- Dashboard hamburger has a focus ring, 44px target, and `aria-controls` pointing at the mobile drawer. Drawer wordmark is ConsentFlow.
- Organization and website settings labels associate with their controls via `htmlFor` / `id`.
- Monitoring filters have `aria-label`s. Website / purpose / vendor search fields have `sr-only` labels.
- Auth marketing title is no longer a second `h1`. Empty-state titles are `h2`.
- Clerk primary button CSS matches dashboard navy (`#2c4a7c`), not indigo `#4F46E5`.
- Hero meta text no longer uses `#9CA3AF` on white.

### Operator UX

- Published policy: Banner Studio is outline; Install (or Review & publish) stays the only primary.
- Setup reopen control is visible on extra-small screens.
- Transfers and Developers empty states use `EmptyState` with a next-step link.

## Why

A CMP cannot ship fake customers or a trial it does not run. Keyboard and label gaps were blocking WCAG-oriented use of public legal-adjacent forms and settings.

## Files / components modified

- `src/app/page.tsx`, `src/app/globals.css`
- `src/components/public/home-trusted-features.tsx`, `home-use-cases-cta.tsx`, `home-footer.tsx`, `home-navbar.tsx`
- `src/components/ui/skip-link.tsx` (new), `empty-state.tsx`
- `src/components/auth/auth-page-shell.tsx`
- `src/components/dashboard/dashboard-shell.tsx`, `setup-guide.tsx`
- `src/app/privacy-request/page.tsx`, `src/app/guardian-consent/page.tsx`
- `src/app/dashboard/policies/[id]/page.tsx`, `transfers/page.tsx`, `developers/page.tsx`, `monitoring/page.tsx`
- `src/components/settings/organization-settings-form.tsx`
- `src/components/websites/website-settings-form.tsx`, `website-list.tsx`
- `src/components/purposes/purpose-list.tsx`, `src/components/vendors/vendor-list.tsx`

Reports (not product UI): `UI_UX_AUDIT.md`, `UI_UX_REDESIGN_PLAN.md`.

## UX impact

Prospects no longer see invented logos or a trial. Keyboard users can skip chrome. Public DSAR/guardian forms are labeled. Operators get one primary on the policy header and can reopen Setup on a phone.

## Remaining issues (SHOULD / OPTIONAL)

- No real Terms or Privacy pages (do not invent them).
- Marketing indigo vs dashboard navy still coexist.
- Dashboard focus trap, table captions, and many missing `loading.tsx` files.
- Three “setup complete” definitions still differ slightly.
- `/dashboard` was not click-tested (Clerk 307). In-editor browser tools were unavailable; public pages were verified over HTTP.
- SDK demo still uses `alert()` for some errors.

## Verification

- `npm run typecheck` passed.
- Live `/` HTML: skip link present; Airbnb / trial / “thousands” absent.
- Live `/privacy-request` and `/sign-in`: labels and skip link present; 99.99% claim removed.
