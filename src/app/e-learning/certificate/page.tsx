import Link from "next/link";

import { CertificateDocument } from "@/components/learning/certificate-document";
import { learnerPageContext } from "@/lib/learning/page-context";
import { certificateQrSvg } from "@/lib/learning/qr-svg";
import { getCertificate } from "@/lib/learning/service";

export default async function CertificatePage() {
  const learner = await learnerPageContext();
  const result = await getCertificate(learner);
  if (result.error) {
    return (
      <div className="page-wrap space-y-4">
        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h1 className="text-2xl font-semibold">Certificate of Completion</h1>
          <p className="mt-3 text-sm">The certificate is available after every module quiz and the final examination are passed.</p>
          <Link href="/e-learning" className="mt-4 inline-block text-sm underline">
            Return to the course
          </Link>
        </section>
        <p className="text-sm">
          <Link href="/learning/certificate/demo" className="font-semibold underline">
            View the design specimen
          </Link>
        </p>
      </div>
    );
  }
  const certificate = result.certificate;
  const qrSvg = await certificateQrSvg(certificate.verificationUrl);
  return (
    <div className="page-wrap">
      <CertificateDocument certificate={certificate} qrSvg={qrSvg} />
    </div>
  );
}
