import type { Metadata } from "next";

import { CertificateDocument } from "@/components/learning/certificate-document";
import { demoCertificate } from "@/lib/learning/certificate-demo";
import { certificateQrSvg } from "@/lib/learning/qr-svg";

export const metadata: Metadata = {
  title: "DPDP certificate design specimen — Consent Guru",
  robots: { index: false, follow: false },
};

export default async function CertificateSpecimenPage() {
  const certificate = demoCertificate();
  const qrSvg = await certificateQrSvg(certificate.verificationUrl);
  return (
    <main className="min-h-screen bg-[#f3f7f6] px-4 py-8 text-[#0B2C4A] sm:px-6 sm:py-12">
      <div className="mx-auto mb-6 max-w-[920px]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00A88F]">Design specimen</p>
        <h1 className="mt-2 text-2xl font-semibold">30-day DPDP Act certificate</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4d6570]">
          Sample layout for review. The QR code opens the live verification page and shows this certificate as verified.
        </p>
      </div>
      <CertificateDocument certificate={certificate} qrSvg={qrSvg} />
    </main>
  );
}
