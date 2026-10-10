# Consent Guru — SEO and AEO audit

Audit date: 8 October 2026. Entity the site should be understood as: a **consent management platform** (consent management software) that helps organizations operate digital consent, cookie consent, privacy preferences, consent records, consent enforcement, and privacy workflows, including DPDP-related consent management. The product does not by itself make an organization legally compliant.

Scores below are after the changes in `SEO_AEO_CONSENT_IMPLEMENTATION_PLAN.md`. They are editorial judgments of topical coverage and technical readiness, not rankings from a search engine.

## Keyword coverage

| Topic | Score | Where it lives |
| --- | --- | --- |
| Consent Management | 8/10 | `/consent-management`, homepage, footer |
| Consent Management Platform | 9/10 | Homepage H1 and title, `/consent-management-platform`, `SoftwareApplication` schema |
| Consent Management Software | 7/10 | Named on the platform page and in the footer. `/consent-management-software` 308s to the platform page so there is no second copy |
| Cookie Consent | 8/10 | `/cookie-consent-manager` (title: Cookie Consent Management). `/cookie-consent-management` 308s there |
| Privacy Management | 7/10 | `/privacy-compliance`, with links out to GDPR, CPRA, DPDP, LGPD, PIPEDA, POPIA, and Singapore PDPA articles |
| DPDP | 8/10 | `/dpdp-act` guide, `/dpdp`, training course |
| DPDP Compliance | 8/10 | `/dpdp-compliance` |
| DPDP Consent | 8/10 | `/dpdp-consent-requirements` and `/dpdp` |
| DPDP Consent Management | 8/10 | Canonical page is `/dpdp`. `/dpdp-consent-management` 308s there |
| GDPR Consent | 7/10 | `/gdpr` plus the consent-vs-legitimate-interest article |
| Enterprise CMP | 7/10 | `/enterprise-consent-management`. Plan limits stay on `/pricing` |
| Consent Analytics | 7/10 | `/consent-analytics` |
| Consent Records | 8/10 | `/consent-records` |
| Consent Enforcement | 8/10 | `/consent-enforcement` |
| Preference Center | 8/10 | `/privacy-preference-center` |
| AEO | 8/10 | Direct answer under the H1 on product and DPDP pages, FAQ schema, homepage questions, `/faqs`, `public/llms.txt` |

## Technical SEO

- Canonicals are path-relative and resolve through `metadataBase` (`https://consentguru.com`). Checked on the homepage and `/dpdp-compliance`.
- `robots.txt` allows the public marketing URLs and disallows `/dashboard`, `/api/`, sign-in, and private learning routes (`/e-learning/module/`, `/e-learning/manage`, `/e-learning/certificate`, `/e-learning/final-exam`, `/learning/`).
- Those private learning routes also send `X-Robots-Tag: noindex, nofollow` and a `noindex` robots meta tag.
- `sitemap.xml` lists the new public URLs and does not list module, quiz, exam, or certificate URLs. `lastModified` is a stable content date (8 October 2026) instead of a new timestamp on every request. Blog posts keep their published dates.
- Alias URLs 308 to the canonical page: cookie consent management, DPDP consent management, and consent management software.
- The public course catalog at `/e-learning` renders for a signed-out visitor. Lessons, quizzes, the exam, certificates, and course management stay behind sign-in.

## On-page SEO

- Homepage title: “Consent Management Platform | Privacy & Cookie Consent Manager”.
- Homepage H1: “Consent management platform for privacy compliance”. The previous slogan remains as the eyebrow.
- Product and regime pages have a unique title, H1, description, and a question-then-answer block before the longer explanation.
- Copy says the platform helps organizations manage and operationalize consent requirements. It does not say compliance is guaranteed, and it does not call Consent Guru a Consent Manager registered with the Data Protection Board.
- The DPDP course H1 is “DPDP Act training”. Visible copy and Course schema call the credential a certificate of completion, not an accreditation.

## Structured data

- Sitewide: `Organization` and `WebSite`.
- Homepage and product pages: `SoftwareApplication` (category Consent Management Platform, feature list limited to capabilities the product pages describe), `WebPage`, and on the homepage `FAQPage`.
- Landing pages: `WebPage`, `BreadcrumbList`, `FAQPage`. The lead answer is included in the FAQ graph when it is not already one of the accordion questions.
- `/e-learning`: `Course` with provider Consent Guru, `educationalCredentialAwarded` “Certificate of completion”, and a breadcrumb. Confirmed in the guest HTML.
- No `AggregateRating`. The site does not publish reviews to mark up.
- No `Offer` prices. Pricing is quote-based.

## Content architecture

```text
Home
├── Consent management platform
│   ├── Consent management
│   │   ├── Consent records
│   │   └── Consent enforcement
│   ├── Cookie consent management → banner, preference center
│   ├── Consent analytics
│   └── Enterprise consent management → API, SDK
├── DPDP
│   ├── DPDP Act guide (/dpdp-act)
│   ├── DPDP consent management (/dpdp)
│   ├── DPDP compliance
│   ├── DPDP consent requirements
│   └── DPDP Act training (/e-learning)
├── Privacy compliance → GDPR, CCPA/CPRA, and articles for LGPD, PIPEDA, POPIA, PDPA
└── Compare → platform comparison checklist
```

Near-duplicate URLs were not created. `/dpdp` remains the DPDP consent-management URL. Cookie consent stays on `/cookie-consent-manager`.

## Internal linking

Homepage topic map, footer, the Company menu, and related-link blocks connect DPDP compliance → DPDP consent requirements → consent management → records → enforcement → analytics. Anchor text names the destination (“DPDP consent requirements”, “consent records”) without repeating one exact match in every sentence.

## DPDP topic coverage

Covered in page copy, aligned with the existing DPDP Act guide: Data Principal, Data Fiduciary, consent as free, specific, informed, unconditional, and unambiguous, a clear affirmative action, notice contents (data, purpose, withdrawal, rights, complaint to the Board), withdrawal as easy as giving consent, legitimate uses as a separate ground, and the difference between software and a registered Consent Manager. The pages tell readers to confirm the Rules and sector duties with counsel. They do not invent rule numbers.

## Consent management topic coverage

The lifecycle is explicit: notice → choice → record and evidence → enforcement → withdrawal → analytics. Cookie consent, the preference center, the API, and the SDK are separate pages with distinct jobs.

## AEO readiness

Informational pages lead with a question and a short answer, then the explanation. The same answers are in FAQ schema. Homepage questions cover what a CMP is, what the software does, how DPDP workflows are supported, and that compliance is not guaranteed.

## AI search readiness

`https://consentguru.com/llms.txt` (`public/llms.txt`) states the entity, points at the canonical pages, and says private learning URLs are not public documents. It repeats the limit that the software is not a registered Consent Manager and does not create compliance by itself.

## Performance

New landings use the existing server-rendered landing template. No new client-only page and no new image weight were added for them. The homepage change is copy and a short FAQ. Core Web Vitals were not measured in a lab run during this pass, so no CWV score is claimed.

## Indexability

Verified on the local dev server:

- `/`, `/dpdp-compliance`, `/dpdp-consent-requirements`, `/consent-records`, `/consent-enforcement`, `/enterprise-consent-management`, `/compare`, and `/compare/consent-management-platforms` return 200, with indexable robots and a canonical on the HTML pages.
- `/cookie-consent-management`, `/dpdp-consent-management`, and `/consent-management-software` return 308 to the canonical URL.
- `/e-learning` returns the public course (H1, curriculum, Course schema) to a signed-out client.
- `/e-learning/module/test-slug` returns `X-Robots-Tag: noindex, nofollow`.
- Sitemap contains the new public paths and does not contain `/e-learning/module`.

## Recommendations

1. Publish the current notice particulars from the DPDP Rules only after counsel reviews them. The requirements page points at the Rules without quoting a section that was not already in the Act guide.
2. The homepage capability matrix marks Consent Guru as included on every row. Treat that grid as a prompt, not as proof about other vendors. This audit did not add competitor score pages.
3. Re-measure Largest Contentful Paint on the homepage after the next production deploy. The hero is still a tall first screen.
4. When a real price list exists, add `Offer` data that matches the pricing page. Do not add it before then.
5. Keep module, quiz, exam, and certificate URLs out of the sitemap even if lesson summaries are later published. Those URLs are account-specific.
