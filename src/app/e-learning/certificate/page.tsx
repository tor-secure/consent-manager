import Link from "next/link";

import { CertificateDocument } from "@/components/learning/certificate-document";
import { PrintButton } from "@/components/learning/print-button";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, primaryBtn, secondaryBtn, textLink } from "@/components/learning/ui";
import { learnerPageContext } from "@/lib/learning/page-context";
import { certificateQrSvg } from "@/lib/learning/qr-svg";
import { getCertificate, getCourseHome } from "@/lib/learning/service";

export default async function CertificatePage() {
  const learner = await learnerPageContext();
  const result = await getCertificate(learner);

  if (result.error) {
    const home = await getCourseHome(learner);
    const progress = home.enrolled ? home.progress : null;
    const completed = progress?.completedModules ?? 0;
    const total = progress?.totalModules ?? home.course.moduleCount;
    const modulesDone = completed >= total;
    const nextStep = !home.enrolled
      ? { href: "/e-learning", label: "Enroll in the course" }
      : modulesDone
        ? { href: "/e-learning/final-exam", label: "Take the final exam" }
        : { href: "/e-learning", label: "Continue learning" };
    const checklist = [
      { label: `Pass all ${total} module quizzes`, detail: `${completed} / ${total} passed`, done: modulesDone },
      {
        label: "Pass the final examination",
        detail: progress?.examPassed ? `Passed · ${progress.examPercentage}%` : progress?.examPercentage != null ? `Last score ${progress.examPercentage}%` : "Not taken",
        done: Boolean(progress?.examPassed),
      },
    ];
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-[#0B2C4A]">
        <section className={`${card} p-6 sm:p-8`}>
          <p className={eyebrow}>Certificate of completion</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">Your certificate is not ready yet</h1>
          <p className="mt-2 text-base leading-7 text-[#36505c]">Finish these two steps and the certificate is issued straight away.</p>
          <div className="mt-5">
            <ProgressBar value={(completed / total) * 100} label="Modules completed" />
          </div>
          <ol className="mt-5 space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${item.done ? "border-[#bfe9e0] bg-[#E6F9F5]" : "border-[#d5e3e0]"}`}>
                <StatusIcon status={item.done ? "completed" : "available"} />
                <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
                <span className="text-sm text-[#4d6570]">{item.detail}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={nextStep.href} className={primaryBtn}>
              {nextStep.label}
            </Link>
            <Link href="/learning/certificate/demo" className={secondaryBtn}>
              See a sample certificate
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const certificate = result.certificate;
  const qrSvg = await certificateQrSvg(certificate.verificationUrl);
  return (
    <div className="space-y-6 text-[#0B2C4A]">
      <section className={`${card} mx-auto flex max-w-[920px] flex-col gap-4 p-5 print:hidden sm:flex-row sm:items-center`} aria-label="Certificate actions">
        <StatusIcon status="completed" size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">Course complete — congratulations</h1>
          <p className="mt-0.5 text-sm text-[#4d6570]">
            Certificate {certificate.certificateCode} · score {certificate.scorePercent}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <Link href={certificate.verificationPath} className={secondaryBtn}>
            Verification page
          </Link>
        </div>
      </section>
      <CertificateDocument certificate={certificate} qrSvg={qrSvg} />
      <p className="text-center print:hidden">
        <Link href="/e-learning" className={textLink}>
          Back to the course
        </Link>
      </p>
    </div>
  );
}
