import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { ArrowButton } from "@/components/ui/arrow-button";
import { socialMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "About ConsentGuru",
  description:
    "Learn how ConsentGuru is helping organizations build transparent, responsible, and trusted digital relationships.",
  ...socialMetadata({
    title: "About ConsentGuru — Powering the Future of Digital Trust",
    description:
      "ConsentGuru helps organizations build transparent, responsible, and trusted relationships with the people whose data they use.",
    path: "/about",
  }),
};

const founders = [
  {
    name: "Shijas Mohidheen",
    role: "Co-Founder",
    image: "/images/founders/SM.png",
    description:
      "With nearly three decades of experience in technology and cybersecurity, Shijas brings extensive experience in cybersecurity operations, enterprise technology, managed security services, compliance, data protection, and digital transformation.",
    detail:
      "His experience working with organizations across industries has provided a practical understanding of the challenges businesses face when implementing security, privacy, and compliance programs. At ConsentGuru, this experience helps translate complex privacy requirements into practical, scalable technology.",
  },
  {
    name: "Sheik Salim Abdul Rahaman",
    role: "Co-Founder",
    image: "/images/founders/SSAR-v3.png",
    description:
      "Sheik Salim brings approximately 15 years of experience across technology, cybersecurity, enterprise solutions, and digital innovation.",
    detail:
      "His experience in technology delivery and enterprise environments contributes to ConsentGuru's focus on creating solutions that are practical to deploy, integrate, operate, and scale. At ConsentGuru, his focus is on helping transform privacy and trust requirements into technology that organizations can use every day.",
  },
  {
    name: "Dr. Ananth Prabhu Gurpur",
    role: "Co-Founder",
    image: "/images/founders/APG-v3.png",
    description:
      "Dr. Ananth Prabhu Gurpur brings a distinctive combination of academia, cybersecurity research, cyber law, digital forensics, and technology.",
    detail:
      "With extensive academic and research experience in cybersecurity and related fields, he brings a perspective that connects technology with education, research, law, and emerging digital risks. His contribution to ConsentGuru helps ensure that our approach to privacy technology is informed not only by current requirements, but also by research, emerging technology, and the evolving digital landscape.",
  },
];

const platformPillars = [
  ["Consent Management", "Capture, manage, record, renew, and withdraw consent across digital channels."],
  ["Preference Management", "Give individuals meaningful control over communication and privacy preferences."],
  ["Privacy Transparency", "Help organizations communicate clearly about what data they collect, why they collect it, and how it is used."],
  ["Consent Records & Auditability", "Maintain reliable records that help organizations demonstrate accountability."],
  ["Privacy Operations", "Connect consent and privacy processes with broader organizational governance."],
  ["Data Subject Experience", "Create simpler and more transparent experiences for individuals exercising their privacy choices."],
  ["Digital Trust", "Help organizations embed trust into their digital interactions rather than treating it as an afterthought."],
  ["Data Governance", "Bring privacy decisions, responsibilities, and accountability into one connected operating model."],
];

const beliefs = [
  ["Privacy is a right.", "People should have meaningful visibility and control over how their personal data is used."],
  ["Trust is earned.", "Organizations must demonstrate responsible data practices through their actions, not just their policies."],
  ["Consent should be meaningful.", "People should understand their choices and be able to change them."],
  ["Transparency matters.", "Privacy information should be understandable, accessible, and relevant."],
  ["Security is foundational.", "Digital trust cannot exist without protecting the information behind it."],
  ["Technology should simplify.", "Privacy technology should reduce complexity rather than add to it."],
  ["Trust should be continuous.", "Digital trust is not created through a single consent event. It is built through every interaction."],
  ["Accountability should be visible.", "Organizations should be able to show how privacy choices are respected throughout the data lifecycle."],
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">{children}</p>
  );
}

export default function AboutPage() {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[#D3E0DE] bg-[#F3FAF8]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#00C4A7]/10" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#0B2C4A]/[0.04]" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28 lg:py-32">
            <div className="max-w-3xl">
              <SectionLabel>About ConsentGuru</SectionLabel>
              <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-[#0B2C4A] sm:text-6xl">
                Powering the future of <span className="text-[#00A88F]">digital trust.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#4B5563] sm:text-xl">
                ConsentGuru is a Digital Trust &amp; Privacy Technology company helping organizations build transparent, responsible, and trusted relationships with the people whose data they use.
              </p>
            </div>
            <div className="mt-14 grid max-w-4xl gap-8 border-t border-[#BFD8D4] pt-8 sm:grid-cols-3 sm:gap-10">
              <div><p className="text-3xl font-bold text-[#0B2C4A]">60+</p><p className="mt-1 text-sm text-[#5D6B73]">years of combined founder experience</p></div>
              <div><p className="text-3xl font-bold text-[#0B2C4A]">1</p><p className="mt-1 text-sm text-[#5D6B73]">shared vision for digital trust</p></div>
              <div><p className="text-3xl font-bold text-[#0B2C4A]">Global</p><p className="mt-1 text-sm text-[#5D6B73]">ambition, built in India</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
          <div><SectionLabel>Why we exist</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">The digital world is built on data.</h2></div>
          <div className="space-y-5 text-[15px] leading-7 text-[#4B5563] sm:text-base">
            <p>Every website visit, mobile application, transaction, customer interaction, connected device, and digital service involves the collection and use of information. As organizations become increasingly data-driven, the ability to manage that data responsibly is no longer simply a regulatory responsibility.</p>
            <p className="text-xl font-semibold leading-8 text-[#0B2C4A]">It is a matter of trust.</p>
            <p>ConsentGuru was created with a simple purpose: to help organizations build, manage, and demonstrate digital trust.</p>
            <p>Our flagship platform brings consent, privacy preferences, transparency, and accountability together to help organizations create better privacy experiences for individuals while simplifying privacy operations for businesses.</p>
          </div>
        </section>

        <section className="bg-[#0B2C4A] px-5 py-20 text-white sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-2xl"><SectionLabel>From consent to trust</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Consent should be more than a checkbox.</h2><p className="mt-6 text-base leading-7 text-white/70">It should be clear, meaningful, transparent, manageable, and changeable. Consent is one part of a much larger relationship between an organization and the individual.</p></div>
            <div className="mt-14 flex flex-wrap items-center gap-x-3 gap-y-5 sm:flex-nowrap sm:gap-x-4">
              {["Consent", "Privacy", "Accountability", "Trust"].map((item, index) => <div key={item} className="flex items-center gap-2"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#00C4A7]/50 text-sm font-bold text-[#7DE4D4]">0{index + 1}</div><span className="text-lg font-semibold">{item}</span>{index < 3 ? <span className="text-xl leading-none text-[#00C4A7]" aria-hidden="true">→</span> : null}</div>)}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-2xl"><SectionLabel>Built by experience</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-5xl">Three founders. One vision.</h2><p className="mt-5 text-base leading-7 text-[#5D6B73]">Three technology professionals bring together more than 60 years of combined industry experience across cybersecurity, enterprise technology, privacy, cyber law, research, education, governance, and digital transformation.</p></div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {founders.map((founder) => <article key={founder.name} className="flex h-full flex-col rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-7 transition hover:-translate-y-1 hover:border-[#00C4A7] hover:shadow-[0_16px_30px_-20px_rgba(11,44,74,0.4)]"><div className="flex items-center gap-5"><div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#0B2C4A]"><Image src={founder.image} alt={`${founder.name} portrait`} fill sizes="96px" className="object-cover" /></div><div><h3 className="text-lg font-bold text-[#0B2C4A]">{founder.name}</h3><p className="mt-1 text-sm font-semibold text-[#00A88F]">{founder.role}</p></div></div><p className="mt-7 text-sm leading-6 text-[#4B5563]">{founder.description}</p><p className="mt-4 text-sm leading-6 text-[#4B5563]">{founder.detail}</p></article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#F3FAF8] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-2xl"><SectionLabel>Our digital trust platform</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-5xl">Privacy operations with a human purpose.</h2><p className="mt-5 text-base leading-7 text-[#5D6B73]">ConsentGuru is evolving beyond traditional consent management to help organizations manage the privacy relationship throughout the data lifecycle.</p></div>
            <div className="mt-12 grid gap-x-10 gap-y-0 md:grid-cols-2">
              {platformPillars.map(([title, description], index) => <div key={title} className="flex gap-4 border-t border-[#C8DEDA] py-6"><span className="text-lg font-bold leading-6 text-[#00A88F]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-bold text-[#0B2C4A]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5D6B73]">{description}</p></div></div>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-24 lg:py-28">
          <div><SectionLabel>Technology with a human purpose</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">Technology should enable trust, not create friction.</h2><div className="mt-6 space-y-4 text-[15px] leading-7 text-[#4B5563]"><p>We believe privacy technology should not make privacy more complicated. It should make it simpler.</p><p>People should be able to understand what they are agreeing to. Organizations should be able to understand and manage their responsibilities. Privacy teams should have the visibility they need. Technology teams should have solutions they can integrate.</p><p>Organizations should be able to demonstrate that they respect the choices people make. That principle is at the heart of ConsentGuru.</p></div></div>
          <div className="rounded-2xl bg-[#0B2C4A] p-8 text-white sm:p-10"><SectionLabel>Our vision</SectionLabel><h2 className="mt-4 text-3xl font-bold leading-tight">To become a global technology platform for Digital Trust and Privacy.</h2><p className="mt-6 leading-7 text-white/70">We envision a future where every individual has meaningful control over their personal data and every organization has the technology to respect that choice. A future where privacy is built into digital experiences.</p><p className="mt-6 text-lg font-semibold text-[#8BE8DA]">Organizations do not simply collect consent. They build trust.</p></div>
        </section>

        <section className="bg-[#E6F9F5] px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-[900px] text-center"><SectionLabel>Our mission</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-5xl">Simplify privacy. Empower individuals. Build lasting digital trust.</h2><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#4B5563]">We are building technology that enables organizations to manage consent and privacy responsibly while creating better experiences for the people they serve.</p></div></section>

        <section className="bg-white px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto max-w-[1200px]"><div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20"><div><SectionLabel>What we believe</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">Trust is built into every interaction.</h2><p className="mt-5 text-base leading-7 text-[#5D6B73]">Privacy is a right. Security is foundational. Technology should simplify. These beliefs guide what we build and how we build it.</p></div><div className="grid gap-x-10 gap-y-0 sm:grid-cols-2">{beliefs.map(([title, description]) => <div key={title} className="border-t border-[#D3E0DE] py-5"><h3 className="font-bold text-[#0B2C4A]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5D6B73]">{description}</p></div>)}</div></div></div></section>

        <section className="relative overflow-hidden bg-[#0B2C4A] px-5 py-20 text-white sm:px-8 lg:py-24"><div className="relative mx-auto max-w-[900px] text-center"><SectionLabel>Built in India. Designed for the world.</SectionLabel><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">The future of privacy is global.</h2><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/70">Privacy and digital trust are no longer limited to a single country or regulation. We are building a platform that serves organizations across industries, geographies, and digital ecosystems.</p><div className="mt-9 flex justify-center"><ArrowButton href="/sign-up" tone="inverse" size="lg">Build trust with us</ArrowButton></div></div></section>
      </main>
      <HomeFooter />
    </div>
  );
}
