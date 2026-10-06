import Image from "next/image";

import { certificateGrade } from "@/lib/learning/grade";

import templateImage from "../../../public/certification/dpdp_certificate_template.png";

export type CertificateDocumentData = {
  learnerName: string;
  courseTitle: string;
  scorePercent: number;
  completedAt: Date | string;
  certificateCode: string;
  verificationUrl: string;
  programLine: string;
};

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Field positions are percentages of the 1496×1051 template artwork. */
export function CertificateDocument({
  certificate,
  qrSvg,
}: {
  certificate: CertificateDocumentData;
  qrSvg: string;
}) {
  return (
    <article
      className="certificate-sheet relative mx-auto w-full max-w-[1100px] overflow-hidden bg-white text-[#0B2C4A] shadow-[0_18px_50px_-24px_rgba(11,44,74,0.45)] [container-type:inline-size] print:max-w-none print:shadow-none"
      aria-label={`Certificate of completion for ${certificate.learnerName}`}
    >
      <Image
        src={templateImage}
        alt=""
        priority
        sizes="(min-width: 1100px) 1100px, 100vw"
        className="block h-auto w-full select-none"
      />

      <p className="sr-only">
        Consent Guru certification of completion. This certifies that {certificate.learnerName} has completed Consent Guru&apos;s online
        training on DPDP Act (Basic Level). Grade {certificateGrade(certificate.scorePercent)}. Completed on {formatDate(certificate.completedAt)}. Certificate
        ID {certificate.certificateCode}.
      </p>

      <div aria-hidden="true">
        <p className="absolute left-1/2 top-[35.6%] w-[72%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[4.1cqw] font-semibold leading-none tracking-tight">
          {certificate.learnerName}
        </p>

        <p className="absolute left-1/2 top-[60.2%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-[2.6cqw] font-semibold leading-none">
          {certificateGrade(certificate.scorePercent)}
        </p>

        <p className="absolute left-[33.8%] top-[71.4%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-[1.75cqw] font-semibold leading-none">
          {formatDate(certificate.completedAt)}
        </p>

        <p className="absolute left-[75.1%] top-[71.4%] w-[30%] -translate-x-1/2 -translate-y-1/2 break-all text-center text-[1.6cqw] font-semibold leading-tight tabular-nums">
          {certificate.certificateCode}
        </p>
      </div>

      <a
        href={certificate.verificationUrl}
        aria-label="Verify this certificate"
        className="absolute left-[83.9%] top-[76.2%] block w-[11%] bg-white p-[0.35cqw] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </article>
  );
}
