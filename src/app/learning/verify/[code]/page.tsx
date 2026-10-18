import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CertificateDocument } from "@/components/learning/certificate-document";
import { secondaryBtn } from "@/components/learning/ui";
import { safeDecodeCertificateCode } from "@/lib/learning/assessment-input";
import { certificateQrSvg } from "@/lib/learning/qr-svg";
import { verifyCertificate } from "@/lib/learning/service";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: raw } = await params;
  const code = safeDecodeCertificateCode(raw);
  if (!code) return { title: "Certificate not found — Consent Guru" };
  const certificate = await verifyCertificate(code);
  if (!certificate) return { title: "Certificate not found — Consent Guru" };
  if (certificate.specimen) {
    return {
      title: `Specimen certificate — Consent Guru`,
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Certificate verified — ${certificate.learnerName} — Consent Guru`,
    robots: { index: false, follow: false },
  };
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { code: raw } = await params;
  const code = safeDecodeCertificateCode(raw);
  if (!code) notFound();
  const certificate = await verifyCertificate(code);
  if (!certificate) notFound();
  const qrSvg = await certificateQrSvg(certificate.verificationUrl);
  const specimen = Boolean(certificate.specimen);
  return (
    <main className="min-h-screen bg-[#f3f7f6] px-4 py-8 text-[#0B2C4A] sm:px-6 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#E6F9F5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0B2C4A]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#00C4A7]" aria-hidden="true" />
            {specimen ? "Specimen only" : "Certificate verified"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            {specimen
              ? "This is a design specimen, not an issued certificate"
              : "Consent Guru confirms this certificate"}
          </h1>
          <p className="mt-2 text-sm text-[#4d6570]">
            {specimen
              ? `Sample layout for ${certificate.programLine}. Certificate ID ${certificate.certificateCode} is not authentic.`
              : `${certificate.learnerName} is ${certificate.programLine}. Certificate ID ${certificate.certificateCode}.`}
          </p>
        </div>
        <Link href="/" className={secondaryBtn}>
          Homepage
        </Link>
      </div>
      <CertificateDocument certificate={certificate} qrSvg={qrSvg} />
    </main>
  );
}
