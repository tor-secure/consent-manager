import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { EnrollButton } from "@/components/learning/enroll-button";
import { GuestModuleOutline } from "@/components/learning/guest-module-outline";
import { FeaturedModuleCard, ModuleCards } from "@/components/learning/module-cards";
import { VerifyCertificateForm } from "@/components/learning/verify-certificate-form";
import { primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getLearningSession } from "@/lib/learning/auth";
import {
  enrollInCourse,
  getCourseHome,
  getPublicCourseCatalog,
  warmLearningCatalog,
  warmModuleLesson,
} from "@/lib/learning/service";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";
import { breadcrumbSchema, courseSchema, graphSchema } from "@/lib/structured-data";

const title = "DPDP Act Training";
const description =
  "Free 30-module e-learning course on India’s DPDP Act, 2023 and DPDP Rules, 2025. Pass the quizzes and final exam to earn a certificate of completion.";
const ENROLL_BANNER_SRC = "/cgl-thumnails/dpdpcoursethumb.png";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/e-learning"),
  ...socialMetadata({ title: `${title} — Consent Guru`, description, path: "/e-learning" }),
};

function EnrollHero({
  heading,
  body,
  primary,
  secondary,
}: {
  heading: string;
  body: string;
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <section className="relative isolate min-h-[20rem] overflow-hidden rounded-[1.75rem] bg-[#0B2C4A] text-white shadow-[0_28px_60px_-40px_rgba(11,44,74,0.55)] sm:min-h-[24rem] lg:min-h-[26rem]">
      <Image
        src={ENROLL_BANNER_SRC}
        alt="Consent Guru DPDP Act training"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_28%] sm:object-center"
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: [
            "linear-gradient(105deg, rgba(11,44,74,0.94) 0%, rgba(11,44,74,0.78) 38%, rgba(11,44,74,0.42) 62%, rgba(10,79,74,0.22) 100%)",
            "linear-gradient(180deg, rgba(11,44,74,0.25) 0%, transparent 30%, transparent 72%, rgba(11,44,74,0.45) 100%)",
            "radial-gradient(circle at 16% 22%, rgba(0,196,167,0.3), transparent 40%)",
          ].join(", "),
        }}
      />
      <div className="relative flex min-h-[20rem] flex-col justify-center p-6 sm:min-h-[24rem] sm:p-8 lg:min-h-[26rem] lg:max-w-[56%] lg:p-10 xl:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7FE8D6]">Consent Guru learning</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-[2.5rem] xl:text-[2.75rem]">
          {heading}
        </h1>
        <p className="mt-4 max-w-xl text-justify text-base leading-7 text-white/90 xl:text-lg xl:leading-8">{body}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {primary}
          {secondary}
        </div>
      </div>
    </section>
  );
}

function PortalHero({
  heading,
  body,
  primary,
  secondary,
  feature,
  stats,
}: {
  heading: string;
  body: string;
  primary: ReactNode;
  secondary?: ReactNode;
  feature: ReactNode;
  stats: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_50px_-40px_rgba(11,44,74,0.45)] ring-1 ring-[#e4eeec]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.95fr)]">
          <div className="relative flex min-w-0 flex-col justify-center overflow-hidden border-b border-[#eef4f3] bg-[linear-gradient(155deg,#E6F9F5_0%,#ffffff_42%,#f3f7f6_100%)] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div
              className="pointer-events-none absolute -right-10 top-8 h-40 w-40 rounded-full bg-[#00C4A7]/20 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -left-8 bottom-6 h-32 w-32 rounded-full bg-[#0B2C4A]/10 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00A88F]">Your learning desk</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-[1.1] tracking-tight text-[#0B2C4A] sm:text-[2.4rem] xl:text-[2.7rem]">
                {heading}
              </h1>
              <p className="mt-3 max-w-2xl text-justify text-base leading-7 text-[#36505c] xl:text-lg xl:leading-8">{body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {primary}
                {secondary}
              </div>
              <div className="mt-7">{stats}</div>
            </div>
          </div>
          <div className="min-w-0 bg-[linear-gradient(160deg,#E6F9F5_0%,#f7fbfa_55%,#ffffff_100%)] p-4 sm:p-5 lg:p-6">
            {feature}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressStats({
  completed,
  total,
  percent,
  examPassed,
  certificateEligible,
}: {
  completed: number;
  total: number;
  percent: number;
  examPassed: boolean;
  certificateEligible: boolean;
}) {
  const items = [
    { label: "Modules done", value: `${completed}/${total}` },
    { label: "Course progress", value: `${Math.round(percent)}%` },
    { label: "Final exam", value: examPassed ? "Passed" : "Pending" },
    { label: "Certificate", value: certificateEligible ? "Ready" : "Locked" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/50 bg-white/35 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md ring-1 ring-white/30"
        >
          <dt className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d6570]">
            {item.label}
          </dt>
          <dd className="mt-1 text-base font-bold tabular-nums text-[#0B2C4A]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LearningHighlights({
  moduleCount,
  passPercent,
  examPassPercent,
}: {
  moduleCount: number;
  passPercent: number;
  examPassPercent: number;
}) {
  const items = [
    { label: "Structured modules", value: String(moduleCount), hint: "Nine curriculum parts" },
    { label: "Module quiz pass", value: `${passPercent}%`, hint: "Unlocks the next lesson" },
    { label: "Final exam pass", value: `${examPassPercent}%`, hint: "Earns your certificate" },
    { label: "Certificate", value: "Free", hint: "Verifiable completion seal" },
  ];
  return (
    <section aria-label="Course highlights" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <article
          key={item.label}
          className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_40px_-28px_rgba(11,44,74,0.35)] backdrop-blur-md ring-1 ring-[#e4eeec] motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-0.5"
        >
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#00C4A7]/15 blur-2xl motion-safe:transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A88F]">0{index + 1}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0B2C4A]">{item.value}</p>
          <p className="mt-1 text-sm font-semibold text-[#0B2C4A]">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-[#4d6570]">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}

function LearningJourney() {
  const steps = [
    {
      title: "Enrol & start",
      body: "Create a learning account and open Module 01 when you are ready.",
    },
    {
      title: "Learn each module",
      body: "Watch the lesson, read the notes, then take the short quiz.",
    },
    {
      title: "Pass the quizzes",
      body: "Clear each quiz to unlock the next module in the path.",
    },
    {
      title: "Final exam & certificate",
      body: "Sit the timed exam and download your verifiable certificate.",
    },
  ];
  return (
    <section
      aria-labelledby="journey-heading"
      className="overflow-hidden rounded-[1.75rem] bg-[#0B2C4A] text-white shadow-[0_24px_50px_-36px_rgba(11,44,74,0.55)]"
    >
      <div className="relative px-6 py-7 sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, rgba(0,196,167,0.35), transparent 40%), radial-gradient(circle at 88% 0%, rgba(255,255,255,0.12), transparent 34%)",
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7FE8D6]">Your path</p>
          <h2 id="journey-heading" className="mt-2 text-2xl font-semibold tracking-tight">
            How the course works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            A clear loop from first lesson to certificate — built for busy professionals who want practical DPDP fluency.
          </p>
          <ol className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm motion-safe:transition-colors hover:bg-white/15"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7FE8D6]">Step {index + 1}</p>
                <p className="mt-2 text-base font-semibold">{step.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-white/75">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function BeforeYouStart({
  disclaimer,
  passPercent,
  examPassPercent,
}: {
  disclaimer: string;
  passPercent: number;
  examPassPercent: number;
}) {
  const body = disclaimer.replace(/^Legal status note:\s*/, "");
  const [status, educational] = body.split(/(?=This training material)/);
  const prerequisites = [
    "An e-learning account (separate from the Consent Guru workspace login), so your progress, quizzes, and certificate stay with you.",
    "No earlier DPDP module. This foundation programme begins with privacy, data protection, and the terms used in the Act.",
    "About 15 minutes a day for 30 days.",
    `A score of ${passPercent}% or more on each module quiz. The final exam passes at ${examPassPercent}%.`,
  ];
  return (
    <section
      id="before-you-start"
      aria-labelledby="before-you-start-heading"
      className="scroll-mt-24 overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-[#e4eeec]"
    >
      <div className="border-b border-[#eef4f3] bg-[linear-gradient(90deg,#E6F9F5_0%,#ffffff_55%)] px-6 py-5 sm:px-8">
        <h2 id="before-you-start-heading" className="text-xl font-semibold text-[#0B2C4A]">
          Introduction
        </h2>
        <p className="mt-1 max-w-3xl text-justify text-sm leading-6 text-[#36505c]">
          Read this before you enrol. It is the note from the first page of the programme.
        </p>
      </div>
      <div id="guidelines" className="scroll-mt-24 grid gap-0 lg:grid-cols-2">
        <div className="border-b border-[#eef4f3] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <h3 className="text-base font-semibold text-[#0B2C4A]">Prerequisites</h3>
          <ul className="mt-3 space-y-2.5">
            {prerequisites.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
                <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
                <span className="min-w-0 flex-1 text-justify">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-[#0B2C4A]">Guidelines</h3>
          <p className="mt-3 text-justify text-base leading-7 text-[#0B2C4A]">
            <strong className="font-semibold">Legal status note: </strong>
            {status}
          </p>
          {educational ? <p className="mt-3 text-justify text-base leading-7 text-[#0B2C4A]">{educational}</p> : null}
        </div>
      </div>
    </section>
  );
}

function CredentialCards({
  allModulesDone,
  examPassed,
  examPercentage,
  examQuestionCount,
  examPassPercent,
  certificateEligible,
  certificateCode,
  showVerify = true,
  stacked = false,
}: {
  allModulesDone: boolean;
  examPassed: boolean;
  examPercentage: number | null;
  examQuestionCount: number;
  examPassPercent: number;
  certificateEligible: boolean;
  certificateCode?: string | null;
  showVerify?: boolean;
  stacked?: boolean;
}) {
  return (
    <section aria-labelledby="credentials-heading" className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">Credentials</p>
        <h2 id="credentials-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#0B2C4A]">
          Exam, certificate & verification
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#4d6570]">
          Three distinct paths — sit the final paper, claim your completion seal, or check someone else’s certificate ID.
        </p>
      </div>

      <div
        className={`grid gap-4 ${
          stacked ? "grid-cols-1" : showVerify ? "xl:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
        {/* Final exam — slate exam-paper look */}
        <article className="relative overflow-hidden rounded-[1.5rem] bg-[#0B2C4A] text-white shadow-[0_18px_40px_-28px_rgba(11,44,74,0.7)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(255,255,255,0.06) 28px)",
            }}
          />
          <div className="relative flex h-full flex-col p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7FE8D6]">Final paper</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight">Final examination</h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/90">
                {examPassed ? "Passed" : allModulesDone ? "Open" : "Locked"}
              </span>
            </div>
            <p className="mt-4 flex-1 text-sm leading-6 text-white/80">
              {examPassed
                ? `You scored ${examPercentage}%. Retake anytime if you want a higher mark.`
                : allModulesDone
                  ? `${examQuestionCount} questions · pass mark ${examPassPercent}%. Sit when you are ready.`
                  : "Unlocks after all 30 modules are passed. Keep working through the curriculum."}
            </p>
            <div className="mt-6">
              {allModulesDone ? (
                <Link
                  href="/e-learning/final-exam"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#00C4A7] px-5 text-sm font-semibold leading-none text-[#0B2C4A] transition-colors hover:bg-[#7FE8D6]"
                >
                  {examPassed ? "Retake exam" : "Start exam"}
                </Link>
              ) : (
                <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/25 px-5 text-sm font-semibold leading-none text-white/55">
                  Complete modules first
                </span>
              )}
            </div>
          </div>
        </article>

        {/* Certificate — warm parchment seal look */}
        <article className="relative overflow-hidden rounded-[1.5rem] border border-[#e8dcc8] bg-[linear-gradient(160deg,#fffaf0_0%,#f7efe0_45%,#f3e7d4_100%)] shadow-[0_18px_40px_-30px_rgba(120,80,30,0.35)]">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border-[10px] border-[#c9a227]/25"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-4 right-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#c9a227]/15 text-[#8a6a12]"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current stroke-[1.5]">
              <circle cx="12" cy="12" r="7.5" />
              <path d="M9.2 12.2 11 14l3.8-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="relative flex h-full flex-col p-6 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6a12]">Completion seal</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-[#3d2e12]">Certificate</h3>
            <p className="mt-4 flex-1 text-sm leading-6 text-[#5c4a2a]">
              {certificateEligible
                ? `Issued and ready to download${certificateCode ? ` · ${certificateCode}` : ""}.`
                : "Awarded when you pass the final exam. Your name and score appear on the sealed document."}
            </p>
            <div className="mt-6">
              {certificateEligible ? (
                <Link
                  href="/e-learning/certificate"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#3d2e12] px-5 text-sm font-semibold leading-none text-[#fffaf0] transition-colors hover:bg-[#5c4a2a]"
                >
                  View certificate
                </Link>
              ) : (
                <Link
                  href="/learning/certificate/demo"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#c9a227]/55 bg-white/60 px-5 text-sm font-semibold leading-none text-[#3d2e12] transition-colors hover:bg-white"
                >
                  Preview sample
                </Link>
              )}
            </div>
          </div>
        </article>

        {/* Verify — mint lookup desk */}
        {showVerify ? (
          <article className="relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(165deg,#E6F9F5_0%,#ffffff_48%,#f3f7f6_100%)] ring-1 ring-[#bfe8df] shadow-[0_18px_40px_-32px_rgba(0,164,143,0.45)]">
            <div
              className="pointer-events-none absolute -left-6 top-8 h-24 w-24 rounded-full bg-[#00C4A7]/15 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative flex h-full flex-col p-6 sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00A88F]">Public check</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-[#0B2C4A]">Verify a certificate</h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-[#36505c]">
                Enter the certificate ID printed on a Consent Guru DPDP certificate to confirm authenticity.
              </p>
              <div className="mt-6">
                <VerifyCertificateForm />
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

export default async function DpdpCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const catalogReady = warmLearningCatalog();
  const { intent } = await searchParams;
  const learnerSession = await getLearningSession();

  // After Learning Clerk sign-in, finish enrollment then drop the intent query.
  if (learnerSession && intent === "enroll") {
    const current = await getCourseHome(learnerSession);
    if (!current.enrolled) await enrollInCourse(learnerSession);
    redirect("/e-learning");
  }

  const home = learnerSession ? await getCourseHome(learnerSession) : await getPublicCourseCatalog();
  await catalogReady;

  const courseLd = graphSchema([
    courseSchema({
      name: home.course.title || "DPDP Act training",
      description,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "DPDP Act training", path: "/e-learning" },
    ]),
  ]);

  if (!home.enrolled) {
    return (
      <div className="space-y-6 text-[#0B2C4A] lg:space-y-8">
        <JsonLd id="dpdp-course-jsonld" data={courseLd} />
        <EnrollHero
          heading="DPDP Act training"
          body="Learn the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025 through 30 structured modules, quizzes, and a final exam, with a certificate when you pass."
          primary={<EnrollButton moduleCount={home.course.moduleCount} signedIn={Boolean(learnerSession)} />}
          secondary={
            <Link
              href="#modules-heading"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/35 bg-transparent px-5 text-sm font-semibold leading-none text-white hover:bg-white/10"
            >
              Browse modules
            </Link>
          }
        />
        <LearningHighlights
          moduleCount={home.course.moduleCount}
          passPercent={home.course.passPercent}
          examPassPercent={home.course.examPassPercent}
        />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-8">
          <div className="space-y-6 lg:space-y-8">
            <LearningJourney />
            <BeforeYouStart
              disclaimer={home.course.disclaimer}
              passPercent={home.course.passPercent}
              examPassPercent={home.course.examPassPercent}
            />
          </div>
          <div className="space-y-6 lg:space-y-8 xl:sticky xl:top-24">
            <CredentialCards
              allModulesDone={false}
              examPassed={false}
              examPercentage={null}
              examQuestionCount={home.course.examQuestionCount}
              examPassPercent={home.course.examPassPercent}
              certificateEligible={false}
              showVerify
              stacked
            />
          </div>
        </div>
        {learnerSession ? <ModuleCards modules={home.modules} /> : <GuestModuleOutline modules={home.modules} />}
      </div>
    );
  }

  const { progress } = home;
  const current = home.modules.find((item) => item.status === "in_progress" || item.status === "available");
  if (current) warmModuleLesson(current.slug).catch(() => undefined);
  const allModulesDone = progress.completedModules >= progress.totalModules;
  const feature = current ?? home.modules[home.modules.length - 1];
  const primary = progress.certificateEligible
    ? { href: "/e-learning/certificate", label: "View certificate" }
    : allModulesDone
      ? { href: "/e-learning/final-exam", label: "Take final exam" }
      : current
        ? {
            href: `/e-learning/module/${current.slug}`,
            label: progress.completedModules === 0 && !current.lessonComplete ? "Start Module 1" : `Continue Module ${current.number}`,
          }
        : { href: "/e-learning/final-exam", label: "Take final exam" };

  return (
    <div className="space-y-6 text-[#0B2C4A] lg:space-y-8">
      <JsonLd id="dpdp-course-jsonld" data={courseLd} />
      <PortalHero
        heading={home.course.title}
        body="Learn practical DPDP compliance through structured modules and interactive quizzes, tracked to your learning account."
        primary={
          <Link href={primary.href} prefetch={primary.href.includes("/module/")} className={primaryBtn}>
            {primary.label} →
          </Link>
        }
        secondary={
          allModulesDone && !progress.certificateEligible ? undefined : (
            <Link href="#modules-heading" className={secondaryBtn}>
              Browse modules
            </Link>
          )
        }
        feature={
          feature ? (
            <FeaturedModuleCard module={feature} enrolled />
          ) : (
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl bg-[#E6F9F5] p-6 text-sm text-[#4d6570]">
              Modules loading…
            </div>
          )
        }
        stats={
          <ProgressStats
            completed={progress.completedModules}
            total={progress.totalModules}
            percent={progress.completionPercentage}
            examPassed={progress.examPassed}
            certificateEligible={progress.certificateEligible}
          />
        }
      />

      {progress.completedModules === 0 && !current?.lessonComplete ? (
        <>
          <LearningHighlights
            moduleCount={home.course.moduleCount}
            passPercent={home.course.passPercent}
            examPassPercent={home.course.examPassPercent}
          />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-8">
            <div className="space-y-6 lg:space-y-8">
              <LearningJourney />
              <BeforeYouStart
                disclaimer={home.course.disclaimer}
                passPercent={home.course.passPercent}
                examPassPercent={home.course.examPassPercent}
              />
            </div>
            <div className="xl:sticky xl:top-24">
              <CredentialCards
                allModulesDone={allModulesDone}
                examPassed={progress.examPassed}
                examPercentage={progress.examPercentage}
                examQuestionCount={home.course.examQuestionCount}
                examPassPercent={home.course.examPassPercent}
                certificateEligible={progress.certificateEligible}
                certificateCode={progress.certificateCode}
                stacked
              />
            </div>
          </div>
        </>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:gap-8">
          <div className="min-w-0 space-y-6 lg:space-y-8">
            <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  href: allModulesDone ? "/e-learning/final-exam" : `#modules-heading`,
                  label: allModulesDone ? "Open final exam" : "Jump to modules",
                  hint: allModulesDone ? "Sit the timed paper" : "Continue where you left off",
                  tone: "bg-[#0B2C4A] text-white",
                },
                {
                  href: "/e-learning/certificate",
                  label: progress.certificateEligible ? "View certificate" : "Certificate status",
                  hint: progress.certificateEligible ? "Download your seal" : "Unlocks after the exam",
                  tone: "bg-white text-[#0B2C4A] ring-1 ring-[#e4eeec]",
                },
                {
                  href: "/dpdp-act",
                  label: "Explore DPDP Act",
                  hint: "Site guide · leave the desk anytime",
                  tone: "bg-[#E6F9F5] text-[#0B2C4A] ring-1 ring-[#cfe8e2]",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-2xl px-4 py-4 motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-0.5 ${item.tone}`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p
                    className={`mt-1 text-xs leading-5 ${
                      item.tone.includes("text-white") ? "text-white/75" : "text-[#4d6570]"
                    }`}
                  >
                    {item.hint}
                  </p>
                </Link>
              ))}
            </section>
            <ModuleCards modules={home.modules} currentSlug={allModulesDone ? null : current?.slug} />
          </div>
          <div className="xl:sticky xl:top-24">
            <CredentialCards
              allModulesDone={allModulesDone}
              examPassed={progress.examPassed}
              examPercentage={progress.examPercentage}
              examQuestionCount={home.course.examQuestionCount}
              examPassPercent={home.course.examPassPercent}
              certificateEligible={progress.certificateEligible}
              certificateCode={progress.certificateCode}
              stacked
            />
          </div>
        </div>
      )}

      {progress.completedModules === 0 && !current?.lessonComplete ? (
        <ModuleCards modules={home.modules} currentSlug={allModulesDone ? null : current?.slug} />
      ) : null}
    </div>
  );
}
