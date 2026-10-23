# UI route coverage

109 page modules inventoried from `src/app`. Shared changes reach the page families below; this is not a claim that every route received a unique custom design or authenticated browser verification. Existing backend behavior is preserved.

The local browser harness uses actual components with synthetic data and test-only framework shims. It does not verify Clerk login, full-route server rendering, tenant data, or mutations against a live backend. A separate local component render checks DPDP server-rendered content. Public reading and operational forms deliberately retain content and native affordances.

The final 17-view desktop/mobile suite also covers the article outline, module transcript, tools filtering, and authentication shell. The authentication fixture has no connected login service. These representative checks supplement the route-family boundaries below.

| Route | Redesign surface | Verification boundary |
| --- | --- | --- |
| `/about` | Company story decks and expandable founder biographies | Desktop/mobile fixture |
| `/blogs/[slug]` | Editorial article reader with sticky chapter outline and original full article | Shared family; individual authenticated or full-route acceptance remains manual |
| `/blogs` | Searchable article library, featured story, topic filter | Desktop/mobile search and reset fixture |
| `/ccpa` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/consent-analytics` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/consent-api` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/consent-management-platform` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/consent-management` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/cookie-banner` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/cookie-consent-manager` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/create-organization/[[...create-organization]]` | Navy authentication panel, shared brand typography and existing Clerk flow | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/administration` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/agent-permissioning` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/analytics` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/audit-logs` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/autopilot` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/browser-crawler/[scanId]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/browser-crawler` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/consent-management` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/consent-sessions` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/consent/[consentId]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/consent` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/cross-domain` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/data-flow` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/data-redaction` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/developer` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/developers` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/developers/webhooks` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/digital-twin` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/discovery` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/discovery/runtime` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables; runtime observation inspector | Desktop/mobile drawer/Escape and reduced-motion fixtures |
| `/dashboard/experiments` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables; experiment creation disclosure, existing lifecycle and analytics | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/firewall` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/governance` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/graph` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables; searchable provenance graph and simulation | Desktop/mobile graph selection/filter/simulation/dark fixtures |
| `/dashboard/integrations` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/intelligence` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/monitoring/[id]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/monitoring` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/negotiation` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/notifications` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/policies/[id]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/policies/[id]/preference-center` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/policies/[id]/studio` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/policies/new` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/policies` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/privacy-events` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/purposes/[id]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/purposes/new` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/purposes` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/quality` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/recommendations` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/rights-requests/[id]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/rights-requests` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/risk` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/roi` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/scanner/[scanId]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/scanner` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/settings/organization` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/settings` | Existing redirect; destination receives redesigned shell | Build/typecheck; no separate rendered screen |
| `/dashboard/settings/retention` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/settings/team` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/simulator` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/trackers` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/transfers` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables; transfer/activity/security tabs and creation disclosures | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/vendors/[id]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/vendors/new` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/vendors` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/[id]/child-protection` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/[id]/enforcement` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/[id]/installation` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/[id]` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/[id]/regulations` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/[id]/settings` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites/new` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dashboard/websites` | Dashboard shell, contextual navigation, route transition, shared headers/cards/forms/tables | Shared family; individual authenticated or full-route acceptance remains manual |
| `/developers` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/disclaimer` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/dpdp-act` | Complete-flow Three.js overview hero plus seven alternating sticky scroll-stacking tiles, short captions and compact native detail windows; unique detailed compass, layered notice book, switch console, keyed withdrawal plugs, guardian portal, responsibility vault and evidence archive; Overview-only orb; physically based studio reflections; pointer raycast plus equivalent DOM controls; memory-only purpose/withdrawal/history; one native 13-chapter complete guide; mobile and short viewports render the same real models in ordinary flow, with viewport gating and a 1.25 mobile DPR cap | Latest mobile revision: all 17 actual-component synthetic Chromium desktop/mobile fixture views passed, including the mobile overview hero and seven distinct displayed-canvas screenshots, at most three simultaneous GPU contexts, and pan-y touch behavior. Separate 390x844 touch emulation at devicePixelRatio 3 confirmed the 1.25 render-density cap and a CDP swipe over the figure increased document scroll. Reduced motion produced no canvases; no page errors or demonstration API requests occurred. Typecheck and targeted ESLint passed. The production build passed with 219 generated pages using an invalid local DATABASE_URL without migrations. git diff --check passed with existing LF/CRLF warnings. Current-target detector returned no findings ([]). Prior 44-file unit baseline was not rerun for this revision. Fixtures do not verify live authentication, tenant data, physical phones or Safari. Desktop stacking/fit guards and the dedicated 768x701 withdrawal-history fixture remain covered. |
| `/dpdp` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/dsar` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/e-learning` | Learning workspace and paced module reader with complete transcript | Shared family; individual authenticated or full-route acceptance remains manual |
| `/faqs` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/gdpr` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/google-consent-mode` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/guardian-consent` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/integrations` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/news` | Searchable news feed plus existing source filtering | Shared family; individual authenticated or full-route acceptance remains manual |
| `/` | Marketing hero and interactive consent/discovery/evidence story | Desktop/mobile workflow fixture |
| `/pricing` | Interactive plan explorer, comparison, existing enquiry form | Desktop/mobile plan keyboard and comparison fixture |
| `/privacy-center/consent-preferences` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/privacy-center/cookie-policy` | Searchable legal document reader, expandable sections and full document | Representative privacy policy desktop/mobile fixture |
| `/privacy-center/data-principal-request` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/privacy-center/data-processing-agreement` | Searchable legal document reader, expandable sections and full document | Representative privacy policy desktop/mobile fixture |
| `/privacy-center/grievance` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/privacy-center` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/privacy-center/privacy-policy` | Searchable legal document reader, expandable sections and full document | Representative privacy policy desktop/mobile fixture |
| `/privacy-center/track-request` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/privacy-compliance` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/privacy-preference-center` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/privacy-request` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/resources` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/sdk-demo` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/security` | Solution editorial layout and interactive topic decks, searchable FAQ | Representative solution desktop/mobile fixture |
| `/sign-in/[[...sign-in]]` | Navy authentication panel, shared brand typography and existing Clerk flow | Shared family; individual authenticated or full-route acceptance remains manual |
| `/sign-up/[[...sign-up]]` | Navy authentication panel, shared brand typography and existing Clerk flow | Shared family; individual authenticated or full-route acceptance remains manual |
| `/tools/[tool]` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
| `/tools` | Public shared typography, navigation, route transition and section entrance | Shared family; individual authenticated or full-route acceptance remains manual |
