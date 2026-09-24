import Image from "next/image";

const CERTIFICATIONS: {
  src: string;
  alt: string;
  width: number;
  height: number;
  kind: "wide" | "badge";
  unoptimized?: boolean;
  href?: string;
}[] = [
  {
    src: "/certification/Techens_logo.jpg",
    alt: "iTechens",
    width: 140,
    height: 40,
    kind: "wide",
    href: "https://techensglobal.com/",
  },
  {
    src: "/certification/Certin.jpeg",
    alt: "CERT-In",
    width: 140,
    height: 40,
    kind: "wide",
    href: "https://www.cert-in.org.in/",
  },
  {
    src: "/certification/Ism.jpeg",
    alt: "ISO 27001 certified",
    width: 72,
    height: 72,
    kind: "badge",
    href: "https://www.iso.org/standard/27001",
  },
  {
    src: "/certification/Aicpa.jpeg",
    alt: "AICPA SOC",
    width: 72,
    height: 72,
    kind: "badge",
    unoptimized: true,
    href: "https://www.aicpa-cima.com/home",
  },
  {
    src: "/certification/Torsecure.jpg",
    alt: "Torsecure",
    width: 140,
    height: 40,
    kind: "wide",
    href: "https://torsecure.com/",
  },
];

export function CertificationLogos({
  compact = false,
  heading = "The only consent management platform certified by",
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
            ? "mt-1.5 grid w-full grid-cols-6 items-center justify-items-center gap-x-2 gap-y-2 @[520px]:flex @[520px]:flex-nowrap @[520px]:justify-between @[520px]:gap-x-3"
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
              unoptimized={Boolean(item.unoptimized)}
              className={
                item.kind === "badge"
                  ? compact
                    ? "h-10 w-10 object-contain @[520px]:h-12 @[520px]:w-12"
                    : "h-12 w-12 object-contain sm:h-14 sm:w-14"
                  : compact
                    ? "h-8 w-auto max-w-[110px] object-contain @[520px]:h-9 @[520px]:max-w-[132px]"
                    : "h-8 w-auto max-w-[110px] object-contain sm:h-9 sm:max-w-[140px]"
              }
            />
          );

          return (
            <li
              key={item.src}
              className={[
                "flex items-center justify-center @[520px]:shrink-0 @[520px]:justify-start",
                index < 3 ? "col-span-2" : "col-span-3",
              ].join(" ")}
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.alt} (opens in a new tab)`}
                  className="rounded-sm outline-offset-2 transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00C4A7]"
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
            ? "mt-1.5 !text-center text-[10px] leading-snug text-[#6B7280] sm:text-[11px]"
            : "mt-3 text-left text-xs leading-5 text-[#6B7280]"
        }
      >
        ConsentGuru is a proprietary product of{" "}
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
