import { CreateWebsiteForm } from "@/components/websites/create-website-form";

// Auth + bootstrap is handled by the parent dashboard layout.
export default function NewWebsitePage() {
  return (
    <div className="page-wrap space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <a
            href="/dashboard/websites"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Websites
          </a>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-slate-400">Add Website</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-indigo-500/30">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="4" x2="9" y2="20" />
              </svg>
              <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-xl border-2 border-white bg-emerald-500 shadow-md">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[26px]">
                Add Website
              </h1>
              <p className="text-[15px] leading-relaxed text-slate-500">
                Register a website with your Consent Management Platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <CreateWebsiteForm />

        <aside className="hidden flex-col gap-4 lg:flex">
          <div className="rounded-3xl card-shadow border border-slate-100/70 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-md shadow-indigo-500/25 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              What happens next
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              After you register the website you&apos;ll get a site key, pick a consent
              policy, and install the SDK snippet on your pages.
            </p>
          </div>

          <ul className="space-y-3 rounded-3xl card-shadow border border-slate-100/70 bg-white p-6">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">Valid domain</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Use the apex domain (no <span className="font-mono">https://</span> or trailing path).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">Pick a default policy</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  You can always change region and language later in Settings.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">Banner goes live instantly</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Publish a policy version and visitors see the banner immediately.
                </p>
              </div>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
