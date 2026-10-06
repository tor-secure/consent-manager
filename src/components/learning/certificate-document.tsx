import { BrandLogo } from "@/components/brand/brand-logo";

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

export function CertificateDocument({
  certificate,
  qrSvg,
}: {
  certificate: CertificateDocumentData;
  qrSvg: string;
}) {
  return (
    <article
      className="certificate-sheet mx-auto w-full max-w-[920px] bg-white text-[#0B2C4A] shadow-[0_18px_50px_-24px_rgba(11,44,74,0.45)]"
      aria-label="Certificate of completion"
    >
      <div className="border-[10px] border-[#0B2C4A] p-2 sm:p-3">
        <div className="border border-[#00C4A7] px-5 py-8 sm:px-10 sm:py-10">
          <header className="flex items-center justify-between gap-4">
            <BrandLogo tone="on-light" height={48} />
            <p className="rounded-full bg-[#E6F9F5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0B2C4A] sm:text-xs">
              30-day program
            </p>
          </header>
          <div className="mx-auto mt-6 h-1 w-24 bg-[#00C4A7]" />
          <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#00A88F]">
            Certificate of Completion
          </p>
          <h1 className="mt-3 text-center text-[clamp(1.6rem,1.1rem+1.6vw,2.4rem)] font-semibold leading-tight">
            {certificate.programLine}
          </h1>
          <p className="mt-8 text-center text-sm text-[#4d6570]">This certifies that</p>
          <p className="mt-2 text-center text-[clamp(1.8rem,1.2rem+2vw,2.75rem)] font-semibold leading-tight">
            {certificate.learnerName}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-[#4d6570] sm:text-base">
            has completed Consent Guru’s 30-day DPDP Act training and is {certificate.programLine}.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-medium leading-6 sm:text-base">
            {certificate.courseTitle}
          </p>
          <dl className="mt-8 grid gap-4 border-y border-[#d3e0de] py-4 text-center sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4d6570]">Final score</dt>
              <dd className="mt-1 text-lg font-semibold">{certificate.scorePercent}%</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4d6570]">Completed</dt>
              <dd className="mt-1 text-lg font-semibold">{formatDate(certificate.completedAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4d6570]">Certificate ID</dt>
              <dd className="mt-1 break-all text-lg font-semibold">{certificate.certificateCode}</dd>
            </div>
          </dl>
          <footer className="mt-8 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-md text-center sm:text-left">
              <p className="text-sm font-semibold">Consent Guru</p>
              <p className="mt-1 text-xs leading-5 text-[#4d6570]">
                Issued for completion of the 30-day DPDP Act course. This is a Consent Guru training certificate. It is not issued by the Government of India or the Data Protection Board.
              </p>
            </div>
            <div className="text-center">
              <div
                className="mx-auto h-[148px] w-[148px] bg-white [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4d6570]">Scan to verify</p>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
