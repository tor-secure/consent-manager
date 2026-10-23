import Link from "next/link";
import { DocumentReader } from "./document-reader";
import type { ReactNode } from "react";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import {
  PRIVACY_CENTRE_EFFECTIVE,
  PRIVACY_CENTRE_ORG,
  PRIVACY_CENTRE_PARTS,
  PRIVACY_CENTRE_UPDATED,
  type LegalBlock,
  type LegalSection,
} from "@/content/privacy-centre";

function mailto(email: string) {
  return (
    <a href={`mailto:${email}`} className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]">
      {email}
    </a>
  );
}

function withEmails(text: string) {
  const parts = text.split(/(support@consentguru\.com|shijas@consentguru\.com)/g);
  return parts.map((part, index) =>
    part === "support@consentguru.com" || part === "shijas@consentguru.com" ? (
      <span key={`${part}-${index}`}>{mailto(part)}</span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "p" || block.type === "lead") {
          return (
            <p
              key={index}
              className={
                block.type === "lead"
                  ? "text-justify text-base leading-7 text-[#0B2C4A] sm:text-lg sm:leading-8"
                  : "text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base"
              }
            >
              {withEmails(block.text)}
            </p>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={index} className="space-y-3">
              {block.items.map((item) => (
                <li key={item.title ?? item.text} className="text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base">
                  {item.title ? <span className="font-semibold text-[#0B2C4A]">{item.title}: </span> : null}
                  {withEmails(item.text)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <dl key={index} className="divide-y divide-[#D3E0DE] overflow-hidden rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB]">
            {block.items.map((item) => (
              <div key={item.term} className="grid min-w-0 gap-2 px-5 py-4 sm:grid-cols-[minmax(7rem,12rem)_minmax(0,1fr)] sm:gap-6">
                <dt className="text-sm font-semibold text-[#0B2C4A]">{item.term}</dt>
                <dd className="text-justify text-[15px] leading-7 text-[#4B5563]">{withEmails(item.definition)}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </div>
  );
}

export function PrivacyCentreLayout({
  title,
  intro,
  children,
}: {
  title: string;
  kicker: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <section className="relative overflow-x-clip overflow-y-visible border-b border-[#D3E0DE] bg-[#F3FAF8]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#00C4A7]/10" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
            <h1 className="mt-4 max-w-3xl text-balance text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] font-bold leading-[1.08] tracking-tight text-[#0B2C4A]">
              {title}
            </h1>
            {intro ? (
              <p className="mt-5 max-w-2xl text-justify text-base leading-7 text-[#4B5563] sm:text-lg">{intro}</p>
            ) : null}
            <p className="mt-6 text-sm text-[#5D6B73]">
              Last updated {PRIVACY_CENTRE_UPDATED} · Effective {PRIVACY_CENTRE_EFFECTIVE}
            </p>
          </div>
        </section>
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}

export function PrivacyPartNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Privacy Centre documents" className="mb-10 flex flex-wrap gap-2">
      <Link
        href="/privacy-center"
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
          current === "/privacy-center"
            ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
            : "border-[#D3E0DE] text-[#4B5563] hover:border-[#00C4A7] hover:text-[#0B2C4A]"
        }`}
      >
        Overview
      </Link>
      {PRIVACY_CENTRE_PARTS.map((part) => (
        <Link
          key={part.href}
          href={part.href}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            current === part.href
              ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
              : "border-[#D3E0DE] text-[#4B5563] hover:border-[#00C4A7] hover:text-[#0B2C4A]"
          }`}
        >
          {part.title}
        </Link>
      ))}
    </nav>
  );
}

export function LegalDocument({ sections, current }: { sections: LegalSection[]; current: string }) {
  return <section className="legal-reading-surface bg-white px-5 py-12 sm:px-8 sm:py-16"><div className="mx-auto max-w-[1200px]"><DocumentReader sections={sections.map(section => ({ id: section.id, title: section.title, number: section.number, content: <LegalBlocks blocks={section.blocks} /> }))}><PrivacyPartNav current={current} /></DocumentReader><ContactCard /></div></section>;
}

export function ContactCard() {
  const org = PRIVACY_CENTRE_ORG;
  return (
    <aside className="mt-14 rounded-2xl border border-[#D3E0DE] bg-[#F3FAF8] p-6 sm:p-8">
      <h2 className="text-lg font-bold text-[#0B2C4A]">Contact</h2>
      <p className="mt-3 font-semibold text-[#0B2C4A]">{org.name}</p>
      {org.addressLines.map((line) => (
        <p key={line} className="text-sm leading-6 text-[#4B5563]">
          {line}
        </p>
      ))}
      <p className="mt-4 text-sm leading-6 text-[#4B5563]">
        General privacy contact: {mailto(org.supportEmail)}
      </p>
      <p className="text-sm leading-6 text-[#4B5563]">
        Data Protection Officer: {org.dpoName}, {mailto(org.dpoEmail)}
      </p>
    </aside>
  );
}
