const WHATSAPP_NUMBER = "918951511111";
const WHATSAPP_TEXT = "Hey,I had a doubt regarding Consent Guru";

const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.43 2.15 11.89c0 1.95.51 3.86 1.48 5.54L2 22l4.71-1.55a9.86 9.86 0 0 0 5.33 1.44h.01c5.46 0 9.89-4.43 9.89-9.89C22 6.43 17.5 2 12.04 2zm5.76 14.02c-.24.68-1.4 1.25-1.94 1.33-.49.07-1.12.1-1.81-.11-.42-.13-.95-.31-1.64-.6-2.89-1.25-4.77-4.16-4.92-4.35-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.2-.15.31-.3.48-.14.16-.3.36-.43.49-.14.12-.29.26-.12.51.16.24.73 1.2 1.57 1.95 1.08.96 1.99 1.26 2.27 1.4.27.14.43.12.59-.07.16-.2.68-.79.86-1.06.18-.27.36-.22.61-.13.24.09 1.54.73 1.81.86.27.14.44.2.51.31.07.11.07.64-.17 1.32z" />
    </svg>
  );
}

export function WhatsAppFloat() {
  return (
    <div className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[60] flex items-end gap-2">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-bubble pointer-events-auto mb-0.5 max-w-[168px] rounded-2xl rounded-br-md border border-[#D1FADF] bg-white px-2.5 py-1.5 text-left text-[12px] font-medium leading-4 text-[#14532D] shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)]"
      >
        Chat on WhatsApp
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-btn pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_20px_-6px_rgba(18,140,70,0.7)] transition hover:scale-105 hover:bg-[#1EBE57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        aria-label="Chat on WhatsApp with Consent Guru"
      >
        <WhatsAppGlyph className="h-5 w-5" />
      </a>
    </div>
  );
}
