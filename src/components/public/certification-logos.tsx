import Image from "next/image";

const CERTIFICATIONS: {
  src: string;
  alt: string;
  width: number;
  height: number;
  kind: "wide" | "badge";
  href?: string;
}[] = [
  {
    src: "/certification/Techens_logo.png",
    alt: "iTechens",
    width: 280,
    height: 80,
    kind: "wide",
    href: "https://techensglobal.com/",
  },
  {
    src: "/certification/Certin.png",
    alt: "CERT-In",
    width: 280,
    height: 80,
    kind: "wide",
    href: "https://www.cert-in.org.in/",
  },
  {
    src: "/certification/Ism.png",
    alt: "ISO/IEC 27001",
    width: 160,
    height: 160,
    kind: "badge",
    href: "https://www.iso.org/standard/27001",
  },
  {
    src: "/certification/Aicpa.png",
    alt: "AICPA SOC",
    width: 160,
    height: 160,
    kind: "badge",
    href: "https://www.aicpa-cima.com/home",
  },
  {
    src: "/certification/Torsecure.png",
    alt: "Torsecure",
    width: 280,
    height: 80,
    kind: "wide",
    href: "https://torsecure.com/",
  },
];

export function CertificationLogos({
  compact = false,
  heading = "Organizations and standards",
}: {
  compact?: boolean;
  heading?: string;
}) {
  return (
    <div className={compact ? "@container mt-0 min-w-0 text-center" : "@container mt-8 min-w-0"}>
      <p
        className={
          compact
            ? "!text-center text-[11px] font-semibold leading-snug text-[#0B2C4A] sm:text-xs"
            : "text-left text-sm font-semibold leading-6 text-[#0B2C4A]"
        }
      >
        {heading}
      </p>
      <ul
        className={
          compact
            ? "mt-3 flex w-full min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-4 sm:gap-x-8"
            : "mt-3 flex min-w-0 flex-wrap items-center justify-start gap-x-6 gap-y-4 lg:gap-x-8"
        }
      >
        {CERTIFICATIONS.map((item) => {
          const image = (
            <Image
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              className={
                item.kind === "badge"
                  ? "h-14 w-14 max-w-full object-contain sm:h-16 sm:w-16"
                  : "h-auto max-h-10 w-auto max-w-full object-contain sm:max-h-12"
              }
            />
          );

          return (
            <li
              key={item.src}
              className="flex w-[calc(50%-0.5rem)] min-w-0 max-w-[9.5rem] items-center justify-center sm:w-auto sm:max-w-[11rem]"
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.alt} (opens in a new tab)`}
                  className="inline-flex max-w-full min-w-0 items-center justify-center rounded-sm outline-offset-4 transition-transform duration-300 ease-out hover:z-10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00C4A7] sm:hover:scale-110 sm:focus-visible:scale-110"
                >
                  {image}
                </a>
              ) : (
                image
              )}
            </li>
          );
        })}
      </ul>
      <p
        className={
          compact
            ? "mt-2 !text-center text-[10px] leading-snug text-[#6B7280] sm:text-[11px]"
            : "mt-3 text-left text-xs leading-5 text-[#6B7280]"
        }
      >
        ConsentGuru is a proprietary software of{" "}
        <a
          href="https://techensglobal.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#0B2C4A] underline-offset-2 transition hover:text-[#00C4A7] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00C4A7]"
        >
          TechensGlobal
        </a>
        .
      </p>
    </div>
  );
}
