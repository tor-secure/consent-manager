import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { EnrollButton } from "@/components/learning/enroll-button";
import { FeaturedModuleCard, ModuleCards } from "@/components/learning/module-cards";
import { VerifyCertificateForm } from "@/components/learning/verify-certificate-form";
import { primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { getLearningSession } from "@/lib/learning/auth";
import { getCourseHome, getPublicCourseCatalog, warmLearningCatalog, warmModuleLesson } from "@/lib/learning/service";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";
import { breadcrumbSchema, courseSchema, graphSchema } from "@/lib/structured-data";

const title = "DPDP Act Training";
const description =
  "Consent Guru’s free 30-module e-learning course on India’s DPDP Act, 2023 and DPDP Rules, 2025. Pass module quizzes and the final exam for a certificate of completion (not government accreditation).";
const ENROLL_BANNER_SRC = "/certification/cg_banner.png";

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
    <section className="overflow-hidden rounded-3xl border border-[#e4eeec] bg-white shadow-[0_20px_50px_-36px_rgba(11,44,74,0.4)]">
      <div className="relative aspect-video w-full bg-[#E6F9F5]">
        <Image
          src={ENROLL_BANNER_SRC}
          alt="Consent Guru DPDP Act training"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="object-contain object-center"
        />
      </div>
      <div className="p-6 sm:p-8 lg:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C4A7]">Consent Guru learning</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#0B2C4A] sm:text-[2.35rem] xl:text-[2.6rem]">
          {heading}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#36505c] xl:text-lg xl:leading-8">{body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
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
}: {
  heading: string;
  body: string;
  primary: ReactNode;
  secondary?: ReactNode;
  feature: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#e4eeec] bg-white shadow-[0_20px_50px_-36px_rgba(11,44,74,0.4)]">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,1fr)] lg:items-stretch xl:gap-10">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C4A7]">Consent Guru learning</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#0B2C4A] sm:text-[2.35rem] xl:text-[2.6rem]">
            {heading}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#36505c] xl:text-lg xl:leading-8">{body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {primary}
            {secondary}
          </div>
        </div>
        <div className="min-w-0">{feature}</div>
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
    <section id="before-you-start" aria-labelledby="before-you-start-heading" className="scroll-mt-24 rounded-3xl border border-[#e4eeec] bg-white p-6 sm:p-8">
      <h2 id="before-you-start-heading" className="text-xl font-semibold text-[#0B2C4A]">
        Introduction
      </h2>
      <p className="mt-2 max-w-3xl text-base leading-7 text-[#36505c]">
        Read this before you enrol. It is the note from the first page of the programme.
      </p>
      <div id="guidelines" className="mt-6 scroll-mt-24 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold text-[#0B2C4A]">Prerequisites</h3>
          <ul className="mt-3 space-y-2.5">
            {prerequisites.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
                <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
                <span className="min-w-0 flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#0B2C4A]">Guidelines</h3>
          <p className="mt-3 text-base leading-7 text-[#0B2C4A]">
            <strong className="font-semibold">Legal status note: </strong>
            {status}
          </p>
          {educational ? <p className="mt-3 text-base leading-7 text-[#0B2C4A]">{educational}</p> : null}
        </div>
      </div>
    </section>
  );
}

export default async function DpdpCoursePage() {
  const catalogReady = warmLearningCatalog();
  const learnerSession = await getLearningSession();
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
      <div className="space-y-6 text-[#0B2C4A]">
        <JsonLd id="dpdp-course-jsonld" data={courseLd} />
        <EnrollHero
          heading="DPDP Act training"
          body="Learn the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025 through 30 structured modules, quizzes, and a final exam — with a certificate when you pass."
          primary={<EnrollButton moduleCount={home.course.moduleCount} />}
          secondary={
            !learnerSession ? (
              <Link href="/e-learning/sign-in" className={secondaryBtn}>
                Log in
              </Link>
            ) : null
          }
        />
        <BeforeYouStart
          disclaimer={home.course.disclaimer}
          passPercent={home.course.passPercent}
          examPassPercent={home.course.examPassPercent}
        />
        <section className="rounded-3xl border border-[#e4eeec] bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#0B2C4A]">Verify a certificate</h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6570]">
            Enter the certificate ID printed on a Consent Guru DPDP certificate.
          </p>
          <VerifyCertificateForm />
        </section>
        <ModuleCards modules={home.modules} />
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
    <div className="space-y-6 text-[#0B2C4A]">
      <JsonLd id="dpdp-course-jsonld" data={courseLd} />
      <PortalHero
        heading={home.course.title}
        body="Learn practical DPDP compliance through structured modules and interactive quizzes — tracked to your learning account."
        primary={
          <Link href={primary.href} prefetch={primary.href.includes("/module/")} className={primaryBtn}>
            {primary.label} →
          </Link>
        }
        secondary={
          allModulesDone && !progress.certificateEligible ? (
            <Link href="/e-learning/final-exam" className={secondaryBtn}>
              Take final exam
            </Link>
          ) : progress.certificateEligible ? (
            <Link href="/e-learning/certificate" className={secondaryBtn}>
              Certificate
            </Link>
          ) : (
            <Link href="#modules-heading" className={secondaryBtn}>
              Browse modules
            </Link>
          )
        }
        feature={feature ? <FeaturedModuleCard module={feature} enrolled /> : <div className="rounded-2xl border border-[#e4eeec] bg-[#E6F9F5] p-6" />}
      />

      {progress.completedModules === 0 && !current?.lessonComplete ? (
        <BeforeYouStart
          disclaimer={home.course.disclaimer}
          passPercent={home.course.passPercent}
          examPassPercent={home.course.examPassPercent}
        />
      ) : null}

      <ModuleCards modules={home.modules} currentSlug={allModulesDone ? null : current?.slug} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[#e4eeec] bg-white p-6">
          <h2 className="text-lg font-semibold">Final examination</h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6570]">
            {progress.examPassed
              ? `Passed with ${progress.examPercentage}%.`
              : allModulesDone
                ? `${home.course.examQuestionCount} questions. Pass at ${home.course.examPassPercent}%.`
                : "Unlocks after all 30 modules are passed."}
          </p>
          {allModulesDone ? (
            <Link href="/e-learning/final-exam" className={`${secondaryBtn} mt-4`}>
              {progress.examPassed ? "Retake exam" : "Start exam"}
            </Link>
          ) : null}
        </div>
        <div className="rounded-3xl border border-[#e4eeec] bg-white p-6">
          <h2 className="text-lg font-semibold">Certificate</h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6570]">
            {progress.certificateEligible
              ? `Issued${progress.certificateCode ? ` · ${progress.certificateCode}` : ""}.`
              : "Earned after you pass the final exam."}
          </p>
          {progress.certificateEligible ? (
            <Link href="/e-learning/certificate" className={`${secondaryBtn} mt-4`}>
              View certificate
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#e4eeec] bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[#0B2C4A]">Verify a certificate</h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6570]">
          Enter the certificate ID printed on a Consent Guru DPDP certificate.
        </p>
        <VerifyCertificateForm />
      </section>
    </div>
  );
}
