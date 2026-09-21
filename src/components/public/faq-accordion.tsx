import type { FaqItem } from "@/content/faqs";

function Chevron() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-[#00A88F] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-open:rotate-180"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="rounded-2xl border border-[#D3E0DE] bg-white px-5 sm:px-7">
      {items.map((item, index) => (
        <details
          key={item.question}
          className="group border-b border-[#D3E0DE] last:border-b-0"
          open={index === 0 ? true : undefined}
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-left marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-[15px] font-semibold leading-6 text-[#0B2C4A] sm:text-base">
              <span className="mr-2 text-[#00A88F]">{index + 1}.</span>
              {item.question}
            </span>
            <Chevron />
          </summary>
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-open:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <p className="pb-5 text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base">
                {item.answer}
              </p>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
