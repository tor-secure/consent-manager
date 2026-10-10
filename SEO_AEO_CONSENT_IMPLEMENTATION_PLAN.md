# Consent Guru — SEO and AEO implementation plan

Status: implemented on 8 October 2026, then re-checked against the local app. The audit of the result is `SEO_AEO_CONSENT_PLATFORM_AUDIT.md`.

Alias URLs redirect. They are not extra articles.

| Requested URL | What shipped |
| --- | --- |
| `/cookie-consent-management` | 308 to `/cookie-consent-manager` |
| `/dpdp-consent-management` | 308 to `/dpdp` |
| `/consent-management-software` | 308 to `/consent-management-platform` |
| `/dpdp-compliance` | New page |
| `/dpdp-consent-requirements` | New page |
| `/consent-records` | New page |
| `/consent-enforcement` | New page |
| `/enterprise-consent-management` | New page |
| `/compare` | Buyer’s questions, no competitor scores |
| `/compare/consent-management-platforms` | Checklist of jobs a CMP should do |
| `/compare/[competitor]` | Not created. Named competitor reviews would not be sourced |

## P0 — Indexing

### Task: Stop private learning URLs from being indexed
URL: `/e-learning/module/*`, `/e-learning/manage`, `/e-learning/certificate`, `/e-learning/final-exam`, `/learning/*`
File: `src/app/robots.ts`, `next.config.ts`, `src/app/e-learning/module/layout.tsx`, `src/app/e-learning/manage/layout.tsx`, `src/app/e-learning/certificate/layout.tsx`, `src/app/e-learning/final-exam/layout.tsx`
Keyword/entity: none (crawl control)
Search intent: navigational, private
Implementation: Disallow in robots, `noindex` meta on those layouts, and `X-Robots-Tag: noindex, nofollow`.
Expected SEO impact: Keeps account pages and lesson URLs out of the index.
Expected business impact: Course progress and certificates are not public documents.
Priority: P0
Verification: `robots.txt` lists the disallows. A request to `/e-learning/module/test-slug` returns `X-Robots-Tag: noindex, nofollow`. Sitemap has no `/e-learning/module`.

### Task: Give the public course a crawlable catalog
URL: `/e-learning`
File: `src/app/e-learning/page.tsx`, `src/lib/learning/service.ts`
Keyword/entity: DPDP Act training
Search intent: informational
Implementation: Signed-out visitors get the course pitch, disclaimer, and module list from `getPublicCourseCatalog()`. Sign-in is still required to enrol. Lessons stay on the private routes.
Expected SEO impact: The course URL can be indexed with a real H1 and curriculum instead of a sign-in redirect.
Expected business impact: The training offer is visible before an account exists.
Priority: P0
Verification: A signed-out request returns H1 “DPDP Act training”, the word Curriculum, and Course schema. It does not return `NEXT_REDIRECT`.

### Task: Canonical aliases for duplicate slugs
URL: `/cookie-consent-management`, `/dpdp-consent-management`, `/consent-management-software`
File: `next.config.ts`
Keyword/entity: cookie consent management, DPDP consent management, consent management software
Search intent: commercial
Implementation: Permanent redirects (308) to the existing canonical pages.
Expected SEO impact: One URL per topic.
Expected business impact: Shared links to the longer slugs still land on the product page.
Priority: P0
Verification: Each alias returns 308 and a `Location` of the canonical path.

### Task: Stable sitemap dates
URL: `/sitemap.xml`
File: `src/app/sitemap.ts`
Keyword/entity: all public URLs
Search intent: n/a
Implementation: Static routes and landings use 8 October 2026. Blog posts keep `publishedAt`. New landings are included because they are in `SEO_LANDINGS`.
Expected SEO impact: Crawlers are not told every URL changed on every fetch.
Expected business impact: None direct.
Priority: P0
Verification: Sitemap contains `/dpdp-compliance`, `/consent-records`, `/consent-enforcement`, and `/compare/consent-management-platforms`.

## P1 — Core consent and DPDP pages

### Task: State the primary entity on the homepage
URL: `/`
File: `src/app/page.tsx`, `src/lib/site-metadata.ts`, `src/app/layout.tsx`
Keyword/entity: Consent Management Platform
Search intent: commercial and navigational
Implementation: H1 is “Consent management platform for privacy compliance”. Description and intro name digital consent, cookie consent, privacy preferences, consent records, and DPDP workflows, and say the software helps operationalize requirements. Four homepage questions are visible and in FAQ schema.
Expected SEO impact: The homepage document matches the product entity.
Expected business impact: A visitor can tell what the product is before the feature tour.
Priority: P1
Verification: Browser render shows the H1, the eyebrow slogan, and the sign-up path. HTML contains “What is a Consent Management Platform?”. Canonical is `https://consentguru.com`.

### Task: DPDP compliance page
URL: `/dpdp-compliance`
File: `src/content/seo-topic-pages.ts`, `src/app/dpdp-compliance/page.tsx`
Keyword/entity: DPDP compliance
Search intent: commercial and informational
Implementation: Operational sequence (name the processing, choose consent or a listed legitimate use, publish the notice, record and honor withdrawal). States that the product is not a registered Consent Manager and does not guarantee compliance.
Expected SEO impact: A page for “DPDP compliance” that is not a copy of `/dpdp` or `/dpdp-act`.
Expected business impact: India-facing buyers get a workflow, then a path to sign up.
Priority: P1
Verification: Browser: title “DPDP Compliance — Consent Guru”, H1, direct answer, breadcrumbs Home / DPDP / DPDP compliance, related links. Canonical `https://consentguru.com/dpdp-compliance`.

### Task: DPDP consent requirements page
URL: `/dpdp-consent-requirements`
File: `src/content/seo-topic-pages.ts`, `src/app/dpdp-consent-requirements/page.tsx`
Keyword/entity: DPDP Act consent requirements, consent under the DPDP Act, Data Principal
Search intent: informational
Implementation: Direct answer uses the Act’s consent standard already stated in `src/content/dpdp-act.ts`. FAQs cover Data Principal, notice contents, withdrawal, records, and evidence. Readers are told to confirm the Rules with counsel.
Expected SEO impact: Answers the questions people ask before they look for software.
Expected business impact: Links into the product workflow without presenting the page as legal advice.
Priority: P1
Verification: HTTP 200. H1 “Consent requirements under the DPDP Act”. Direct answer “What is consent under the DPDP Act?”.

### Task: Consent records page
URL: `/consent-records`
File: `src/content/seo-topic-pages.ts`, `src/app/consent-records/page.tsx`
Keyword/entity: consent records, consent receipts, consent evidence, consent audit trail
Search intent: informational and commercial
Implementation: Describes identifier, timestamp, locale, policy snapshot, SHA-256 and HMAC receipts, retention, and legal holds, matching the product pages already on the site. Withdrawal updates the current choice and does not erase history.
Expected SEO impact: A dedicated evidence URL instead of a paragraph inside `/consent-management`.
Expected business impact: Privacy buyers can see what a record contains.
Priority: P1
Verification: HTTP 200. Canonical `https://consentguru.com/consent-records`.

### Task: Consent enforcement page
URL: `/consent-enforcement`
File: `src/content/seo-topic-pages.ts`, `src/app/consent-enforcement/page.tsx`
Keyword/entity: consent enforcement
Search intent: commercial
Implementation: Explains mapped script control, Consent Mode when enabled, and the API for server-side reads. States the SDK cannot retract a request that already left the browser.
Expected SEO impact: Enforcement is its own topic, separate from the cookie scanner page.
Expected business impact: Sets an accurate limit before a demo.
Priority: P1
Verification: HTTP 200.

### Task: Enterprise page
URL: `/enterprise-consent-management`
File: `src/content/seo-topic-pages.ts`, `src/app/enterprise-consent-management/page.tsx`
Keyword/entity: enterprise consent management
Search intent: commercial
Implementation: Multi-site publishing, domain checks, roles, API versus SDK credentials, and regional configurations. Domain quotas stay on `/pricing`. No compliance guarantee.
Expected SEO impact: A page for enterprise CMP queries that points at real administration behavior.
Expected business impact: Routes larger buyers to pricing and the SDK docs.
Priority: P1
Verification: HTTP 200.

### Task: Internal links across the lifecycle
URL: homepage, footer, Company menu, related blocks on existing landings
File: `src/app/page.tsx`, `src/components/public/home-footer.tsx`, `src/components/public/home-navbar.tsx`, `src/content/seo-landings.ts`
Keyword/entity: the lifecycle from DPDP compliance through records and enforcement
Search intent: mixed
Implementation: Topic map and footer add the new URLs. Existing pages link to records, enforcement, DPDP compliance, and DPDP requirements. Privacy compliance links to the LGPD, PIPEDA, POPIA, and Singapore PDPA articles instead of new thin law pages.
Expected SEO impact: Related concepts are one click apart.
Expected business impact: Readers can move from a definition to the product page they need.
Priority: P1
Verification: DPDP compliance page lists consent requirements, the Act guide, consent records, and training. Footer includes those destinations.

## P2 — AEO and comparisons

### Task: Question, then answer, on informational pages
URL: platform, consent management, cookie consent, banner, preference center, analytics, privacy, GDPR, CCPA, DPDP, and the new pages
File: `src/content/seo-landings.ts`, `src/content/seo-topic-pages.ts`, `src/components/public/seo-landing-view.tsx`
Keyword/entity: the question each page is for
Search intent: informational
Implementation: Optional `directAnswer` renders as an H2 and paragraph immediately after the hero. It is added to FAQ schema when the accordion does not already ask it.
Expected SEO impact: Answer engines can quote a sentence that matches the visible page.
Expected business impact: The first screen states the limit of the product, not only the feature name.
Priority: P2
Verification: `/dpdp-compliance` shows “What is DPDP compliance?” and the answer in the browser, above the longer sections.

### Task: Comparison pages without competitor scores
URL: `/compare`, `/compare/consent-management-platforms`
File: `src/content/seo-topic-pages.ts`, `src/app/compare/page.tsx`, `src/app/compare/consent-management-platforms/page.tsx`
Keyword/entity: consent management platform comparison
Search intent: commercial
Implementation: A checklist (records, enforcement, withdrawal, DPDP versus GDPR versus CPRA, API versus SDK). The homepage matrix is described as something to verify, not reproduced as a ranking.
Expected SEO impact: A useful page for comparison queries.
Expected business impact: Procurement questions are explicit, including “do you guarantee compliance?” with the answer no.
Priority: P2
Verification: Both URLs return 200.

### Task: FAQ and course schema
URL: `/faqs`, `/e-learning`
File: `src/content/faqs.ts`, `src/lib/structured-data.ts`, `src/app/e-learning/page.tsx`
Keyword/entity: DPDP compliance, consent under the DPDP Act, Data Principal, consent evidence, DPDP Act training
Search intent: informational
Implementation: Four FAQs added, consistent with the DPDP pages. Course schema uses the catalog title, a completion certificate, and no accreditation claim. `featureList` on `SoftwareApplication` matches the product pages.
Expected SEO impact: FAQ and course rich-result eligibility where the content is visible.
Expected business impact: The course is described as training with a completion certificate.
Priority: P2
Verification: Guest HTML for `/e-learning` contains `educationalCredentialAwarded`. FAQ page source list includes the new questions.

### Task: llms.txt
URL: `/llms.txt`
File: `public/llms.txt`
Keyword/entity: Consent Management Platform
Search intent: n/a
Implementation: Short map of canonical pages, the DPDP cluster, and a note that private learning URLs are not public documents.
Expected SEO impact: A stable summary for answer engines that fetch `llms.txt`.
Expected business impact: The same compliance limit is stated there as on the site.
Priority: P2
Verification: HTTP 200, about 3 KB.

## P3 — Left for later

### Task: Do not add a page per competitor
URL: `/compare/[competitor]`
File: none
Keyword/entity: CMP comparison
Search intent: commercial
Implementation: Skipped. The homepage grid is not a sourced review of other products.
Expected SEO impact: Avoids doorway or misleading comparison URLs.
Expected business impact: Avoids a claim the company would have to defend.
Priority: P3
Verification: No new competitor routes.

### Task: Do not add thin regime landings
URL: none for LGPD, PIPEDA, POPIA, PDPA
File: `src/content/seo-landings.ts` related links, existing posts in `src/content/blogs.ts`
Keyword/entity: those statutes
Search intent: informational
Implementation: Linked from `/privacy-compliance` to articles that already exist.
Expected SEO impact: Coverage without a near-copy of the GDPR page.
Expected business impact: Readers see that one banner is not every statute.
Priority: P3
Verification: Related links on the privacy compliance page.

### Task: Lab Core Web Vitals
URL: `/`
File: none in this pass
Keyword/entity: n/a
Search intent: n/a
Implementation: Not run. New pages reuse the server landing template.
Expected SEO impact: Unknown until measured on production.
Expected business impact: Unknown until measured.
Priority: P3
Verification: Not claimed.
