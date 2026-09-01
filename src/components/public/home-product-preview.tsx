export function HomeProductPreview() {
  return (
    <div
      id="product"
      className="public-scale-reveal hero-stagger-5 relative mx-auto w-full max-w-2xl lg:max-w-none"
      aria-label="Illustrative Consent Manager workspace preview"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-8 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] blur-3xl"
        aria-hidden="true"
      />

      <div className="browser-frame public-float-card relative">
        <div className="browser-chrome">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="browser-dot" />
            <span className="browser-dot" />
            <span className="browser-dot" />
          </span>
          <p className="min-w-0 flex-1 truncate rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] text-[var(--muted-foreground)]">
            app.consent-manager / dashboard
          </p>
        </div>

        <div className="grid bg-[var(--background)] lg:grid-cols-[8.5rem_1fr]">
          <aside className="hidden border-r border-[var(--border)] bg-[var(--card)] p-3 lg:block" aria-hidden="true">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Workspace
            </p>
            <ul className="mt-3 space-y-1 text-[11px]">
              {["Overview", "Websites", "Policies", "Scanner", "Analytics"].map((item, index) => (
                <li
                  key={item}
                  className={[
                    "rounded-md px-2 py-1.5",
                    index === 0
                      ? "bg-[var(--info-soft)] font-medium text-[var(--primary)]"
                      : "text-[var(--muted-foreground)]",
                  ].join(" ")}
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Preview layout
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">Privacy control center</p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
                Sample UI
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Websites", "Connected"],
                ["Policies", "Published"],
                ["Scanner", "Ready"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3">
                  <p className="text-[11px] text-[var(--muted-foreground)]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs font-semibold text-[var(--foreground)]">Purpose categories</p>
                <div className="mt-3 space-y-2.5">
                  {[
                    ["Necessary", "100%"],
                    ["Analytics", "72%"],
                    ["Marketing", "41%"],
                  ].map(([label, width]) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-[11px] text-[var(--muted-foreground)]">
                        <span>{label}</span>
                        <span>Sample</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--muted)]">
                        <div className="h-1.5 rounded-full bg-[var(--primary)]" style={{ width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[#10192b] p-3 text-[var(--primary-foreground)]">
                <p className="text-xs font-semibold text-white">Tracker scan</p>
                <p className="mt-1 text-[11px] text-white/55">example.com — sample finding list</p>
                <ul className="mt-3 space-y-2 text-[11px] text-white/80">
                  {["Script mapped to vendor", "Cookie classified", "Policy version selected"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">Consent notice</p>
              <p className="mt-0.5 text-[11px] leading-5 text-[var(--muted-foreground)]">
                Sample visitor banner for necessary, analytics, and marketing purposes.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex min-h-8 items-center rounded-md border border-[var(--border)] px-3 text-[11px] font-medium text-[var(--secondary-foreground)]">
                Preferences
              </span>
              <span className="inline-flex min-h-8 items-center rounded-md bg-[var(--primary)] px-3 text-[11px] font-medium text-[var(--primary-foreground)]">
                Accept selected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
