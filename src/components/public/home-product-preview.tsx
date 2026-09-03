export function HomeProductPreview() {
  const sidebar = [
    { label: "Dashboard", active: true },
    { label: "Consents", active: false },
    { label: "Preferences", active: false },
    { label: "Integrations", active: false },
    { label: "Reports", active: false },
    { label: "Settings", active: false },
  ];

  const stats = [
    { label: "Total Consents", value: "24,532", delta: "↑ 12.5% vs last 30 days" },
    { label: "Active Users", value: "18,754", delta: "↑ 8.2% vs last 30 days" },
    { label: "Consent Rate", value: "92.6%", delta: "↑ 4.1% vs last 30 days" },
  ];

  const status = [
    { label: "Granted", value: "69.3%", color: "#3B82F6" },
    { label: "Denied", value: "14.2%", color: "#EF4444" },
    { label: "Withdrawn", value: "9.1%", color: "#F59E0B" },
    { label: "No Response", value: "7.4%", color: "#22C55E" },
  ];

  return (
    <div
      id="product"
      className="home-fade-item relative mx-auto w-full max-w-[640px] lg:max-w-none"
      aria-label="ConsentFlow dashboard preview"
    >
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 70% 30%, rgba(88,80,236,0.18), transparent 55%), radial-gradient(ellipse at 30% 80%, rgba(59,130,246,0.12), transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <div className="grid min-h-[420px] sm:grid-cols-[148px_1fr]">
          <aside className="hidden border-r border-[#EEF2F7] bg-[#FAFBFC] p-3 sm:block" aria-hidden="true">
            <div className="mb-4 flex items-center gap-2 px-2 pt-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#5850EC] text-[10px] font-bold text-white">
                CF
              </span>
              <span className="text-[11px] font-semibold text-[#111827]">ConsentFlow</span>
            </div>
            <ul className="space-y-1">
              {sidebar.map((item) => (
                <li key={item.label}>
                  <div
                    className={[
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium",
                      item.active
                        ? "bg-[#EEF2FF] text-[#5850EC]"
                        : "text-[#6B7280]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-1.5 w-1.5 rounded-full",
                        item.active ? "bg-[#5850EC]" : "bg-[#D1D5DB]",
                      ].join(" ")}
                    />
                    {item.label}
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          <div className="relative bg-[#F8FAFC] p-4 sm:p-5">
            <h3 className="text-[15px] font-bold tracking-tight text-[#111827]">Dashboard Overview</h3>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 shadow-sm"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-[#6B7280]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-[#111827]">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-medium text-[#16A34A]">{stat.delta}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-[#111827]">Consent Rate Over Time</p>
                <p className="text-[10px] text-[#9CA3AF]">Last 30 days</p>
              </div>

              <div className="relative mt-3 h-[150px] sm:h-[170px]">
                <svg viewBox="0 0 420 160" className="h-full w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="cf-line-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5850EC" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#5850EC" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[30, 60, 90, 120].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="420"
                      y2={y}
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />
                  ))}
                  <path
                    d="M0 118 C 40 110, 70 95, 105 88 C 140 81, 165 96, 200 78 C 235 60, 260 70, 295 52 C 330 34, 360 48, 420 28 L 420 160 L 0 160 Z"
                    fill="url(#cf-line-fill)"
                  />
                  <path
                    d="M0 118 C 40 110, 70 95, 105 88 C 140 81, 165 96, 200 78 C 235 60, 260 70, 295 52 C 330 34, 360 48, 420 28"
                    fill="none"
                    stroke="#5850EC"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="295" cy="52" r="5" fill="#5850EC" stroke="white" strokeWidth="2" />
                </svg>

                <div className="absolute left-[52%] top-2 hidden -translate-x-1/2 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[10px] text-[#374151] shadow-md sm:block">
                  <span className="font-medium text-[#111827]">May 12, 2025</span>
                  <span className="text-[#9CA3AF]"> • </span>
                  Consent Rate: <span className="font-semibold text-[#5850EC]">92.6%</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-3 right-3 hidden w-[180px] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)] lg:block">
              <p className="text-[12px] font-semibold text-[#111827]">Consent Status</p>
              <div className="mt-2 flex items-center gap-3">
                <svg viewBox="0 0 36 36" className="h-14 w-14 shrink-0" aria-hidden="true">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#EEF2FF" strokeWidth="5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="5"
                    strokeDasharray="60.5 27.5"
                    strokeDashoffset="0"
                    transform="rotate(-90 18 18)"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="5"
                    strokeDasharray="12.5 75.5"
                    strokeDashoffset="-60.5"
                    transform="rotate(-90 18 18)"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="5"
                    strokeDasharray="8 80"
                    strokeDashoffset="-73"
                    transform="rotate(-90 18 18)"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="5"
                    strokeDasharray="6.5 81.5"
                    strokeDashoffset="-81"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <ul className="min-w-0 space-y-1">
                  {status.map((row) => (
                    <li key={row.label} className="flex items-center gap-1.5 text-[9px] text-[#4B5563]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.color }} />
                      <span className="truncate">{row.label}</span>
                      <span className="ml-auto font-semibold text-[#111827]">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
