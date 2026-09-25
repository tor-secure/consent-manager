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
    alt: "ISO 27001 certified",
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
  heading = "The only Consent-Management platform certified by",
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
            ? "mt-2 grid w-full grid-cols-6 items-center justify-items-center gap-x-3 gap-y-3 @[520px]:flex @[520px]:flex-nowrap @[520px]:justify-evenly @[520px]:gap-x-6"
            : "mt-3 grid grid-cols-6 items-center justify-items-center gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:justify-start sm:gap-x-6 sm:gap-y-3 lg:gap-x-8"
        }
      >
        {CERTIFICATIONS.map((item, index) => {
          const image = (
            <Image
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              className={
                item.kind === "badge"
                  ? compact
                    ? "h-14 w-14 object-contain @[520px]:h-16 @[520px]:w-16"
                    : "h-16 w-16 object-contain sm:h-20 sm:w-20"
                  : compact
                    ? "h-10 w-auto max-w-[140px] object-contain @[520px]:h-12 @[520px]:max-w-[180px]"
                    : "h-12 w-auto max-w-[160px] object-contain sm:h-16 sm:max-w-[220px]"
              }
            />
          );

          return (
            <li
              key={item.src}
              className={[
                "relative flex items-center justify-center @[520px]:shrink-0",
                index < 3 ? "col-span-2" : "col-span-3",
              ].join(" ")}
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.alt} (opens in a new tab)`}
                  className="inline-flex origin-center rounded-sm outline-offset-4 transition-transform duration-300 ease-out hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00C4A7]"
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
