import Image from "next/image";

import { certificateGrade } from "@/lib/learning/grade";

import templateImage from "../../../public/certification/dpdp-foundation-certificate.png";

export type CertificateDocumentData = {
  learnerName: string;
  courseTitle: string;
  scorePercent: number;
  completedAt: Date | string;
  certificateCode: string;
  verificationUrl: string;
  programLine: string;
  specimen?: boolean;
};

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function validUntil(value: Date | string): string {
  const date = new Date(value);
  date.setFullYear(date.getFullYear() + 1);
  return formatDate(date);
}

/** Field positions are percentages of the 1496×1051 foundation template. */
export function CertificateDocument({
  certificate,
  qrSvg,
}: {
  certificate: CertificateDocumentData;
  qrSvg: string;
}) {
  const specimen = Boolean(certificate.specimen);
  return (
    <article
      className="certificate-sheet relative mx-auto w-full max-w-[1100px] overflow-hidden bg-white text-[#0B2C4A] shadow-[0_18px_50px_-24px_rgba(11,44,74,0.45)] [container-type:inline-size] print:max-w-none print:shadow-none"
      aria-label={
        specimen
          ? `Specimen certificate layout (not authentic) for ${certificate.learnerName}`
          : `Certificate of completion for ${certificate.learnerName}`
      }
    >
      <Image
        src={templateImage}
        alt=""
        priority
        sizes="(min-width: 1100px) 1100px, 100vw"
        className="block h-auto w-full select-none"
      />

      {specimen ? (
        <p
          className="pointer-events-none absolute left-1/2 top-[48%] z-10 w-[90%] -translate-x-1/2 -translate-y-1/2 -rotate-12 text-center text-[4.5cqw] font-bold uppercase tracking-[0.2em] text-[#0B2C4A]/35"
          aria-hidden="true"
        >
          Specimen — not authentic
        </p>
      ) : null}

      <p className="sr-only">
        {specimen
          ? `Specimen certificate layout only. Not an issued Consent Guru certificate. Sample name ${certificate.learnerName}. Certificate ID ${certificate.certificateCode}.`
          : `Consent Guru certification of completion. This certifies that ${certificate.learnerName} has completed Consent Guru's online training on DPDP Act (Foundation Certification). Grade ${certificateGrade(certificate.scorePercent)}. Completed on ${formatDate(certificate.completedAt)}. Valid for one year, until ${validUntil(certificate.completedAt)}. Certificate ID ${certificate.certificateCode}.`}
      </p>

      <div aria-hidden="true">
        <p className="absolute left-1/2 top-[35.5%] w-[70%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[3.6cqw] font-bold leading-none tracking-tight">
          {certificate.learnerName}
        </p>

        <p className="absolute left-1/2 top-[61.8%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-[2.8cqw] font-bold leading-none">
          {certificateGrade(certificate.scorePercent)}
        </p>

        <p className="absolute left-[33.6%] top-[71.6%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-[1.65cqw] font-semibold leading-none">
          {formatDate(certificate.completedAt)}
        </p>
        <p className="absolute left-[18%] top-[75.6%] w-[31%] -translate-y-1/2 text-center text-[1.2cqw] font-semibold leading-tight">
          Valid for one year
          <span className="mt-[0.35cqw] block font-medium">until {validUntil(certificate.completedAt)}</span>
        </p>

        <p className="absolute left-[75.1%] top-[71.6%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-[1.55cqw] font-semibold leading-none tabular-nums">
          {certificate.certificateCode}
        </p>
      </div>

      <a
        href={certificate.verificationUrl}
        aria-label="Verify this certificate"
        className="absolute left-[84.1%] top-[75.6%] block w-[11%] bg-white p-[0.25cqw] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </article>
  );
}
