"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
type PreviewTab = "dashboard" | "consents" | "preferences" | "integrations" | "reports" | "settings";

const TABS: { id: PreviewTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "consents", label: "Consents" },
  { id: "preferences", label: "Preferences" },
  { id: "integrations", label: "Integrations" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

const overviewStats = [
  { label: "Total Consents", value: "24,532", delta: "↑ 12.5% vs last 30 days" },
  { label: "Active Users", value: "18,754", delta: "↑ 8.2% vs last 30 days" },
  { label: "Consent Rate", value: "92.6%", delta: "↑ 4.1% vs last 30 days" },
];

const status = [
  { label: "Granted", value: "69.3%", color: "#00C4A7" },
  { label: "Denied", value: "14.2%", color: "#EF4444" },
  { label: "Withdrawn", value: "9.1%", color: "#F59E0B" },
  { label: "No Response", value: "7.4%", color: "#22C55E" },
];

const hubKpis = [
  { label: "Consents managed", value: "24,568", delta: "↑ 12%", icon: "people" },
  { label: "Processing activities", value: "318", delta: "↑ 8%", icon: "doc" },
  { label: "Data Principal requests", value: "1,248", delta: "↑ 24%", icon: "user" },
  { label: "Vendors monitored", value: "12", delta: "↑ 20%", icon: "stack" },
];

function KpiIcon({ kind }: { kind: string }) {
  const cls = "h-3.5 w-3.5";
  if (kind === "doc") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3h8l5 5v13H7z" />
        <path d="M15 3v5h5" />
      </svg>
    );
  }
  if (kind === "user") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" />
      </svg>
    );
  }
  if (kind === "stack") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8l8-4 8 4-8 4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 16l8 4 8-4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="15" cy="8" r="2.4" />
      <path d="M4.5 18c.6-2.8 2.6-4.2 4.5-4.2s3.9 1.4 4.5 4.2" />
      <path d="M10.5 18c.4-2 1.8-3.2 3.5-3.2 1.8 0 3.2 1.2 3.6 3.2" />
    </svg>
  );
}

function HubKpis() {
  const tones = ["#00C4A7", "#3B82F6", "#8B5CF6", "#0B2C4A"];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {hubKpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className="flex items-start gap-2 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white px-2 py-1.5 shadow-sm"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: tones[i] }}
          >
            <KpiIcon kind={kpi.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold leading-none tracking-tight text-[#111827]">{kpi.value}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[#6B7280]">{kpi.label}</p>
            <p className="mt-0.5 text-[10px] font-medium text-[#16A34A]">{kpi.delta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CardShell({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: accent }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          </span>
          <p className="text-[12px] font-semibold text-[#111827]">{title}</p>
        </div>
        <span className="text-[#9CA3AF]">›</span>
      </div>
      {children}
    </div>
  );
}

function PreferencesView() {
  const rows = [
    { name: "Marketing Communications", status: "Granted", tone: "granted" },
    { name: "Personalized Offers", status: "Granted", tone: "granted" },
    { name: "Loyalty & Rewards", status: "Withdrawn", tone: "withdrawn" },
  ];
  return (
    <div className="space-y-2">
      <HubKpis />
      <CardShell title="Consent & Preferences" accent="#00C4A7">
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#374151]">{row.name}</span>
              <span
                className={
                  row.tone === "granted"
                    ? "rounded-full bg-[#E6F9F5] px-2 py-0.5 text-[10px] font-semibold text-[#059669]"
                    : "rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]"
                }
              >
                {row.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] font-semibold text-[#2563EB]">Manage Preferences →</p>
      </CardShell>
    </div>
  );
}

function ConsentsView() {
  return (
    <div className="space-y-2">
      <HubKpis />
      <CardShell title="Cookie Consent Management" accent="#8B5CF6">
        <p className="text-[11px] text-[#4B5563]">41 cookies found across 3 domains</p>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
          <span className="w-[29%] bg-[#3B82F6]" />
          <span className="w-[20%] bg-[#8B5CF6]" />
          <span className="w-[51%] bg-[#F59E0B]" />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#6B7280]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />12 Analytics</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />8 Marketing</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" />21 Functional</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-md border border-[#E5E7EB] px-2 py-1 text-[10px] font-semibold text-[#374151]">Manage</span>
          <span className="rounded-md border border-[#FECACA] bg-white px-2 py-1 text-[10px] font-semibold text-[#DC2626]">Reject All</span>
          <span className="rounded-md bg-[#2563EB] px-2 py-1 text-[10px] font-semibold text-white">Accept All</span>
        </div>
      </CardShell>
    </div>
  );
}

function IntegrationsView() {
  return (
    <div className="space-y-2">
      <HubKpis />
      <CardShell title="Third-Party Governance" accent="#F59E0B">
        <ul className="space-y-1.5 text-[11px]">
          <li className="flex items-center justify-between gap-2">
            <span className="text-[#374151]">Fintrust Payments</span>
            <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">High Risk</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="text-[#374151]">Zenith Cloud Services</span>
            <span className="rounded-full bg-[#E6F9F5] px-2 py-0.5 text-[10px] font-semibold text-[#059669]">Low Risk</span>
          </li>
        </ul>
        <p className="mt-2 text-[11px] font-semibold text-[#2563EB]">View all vendors →</p>
      </CardShell>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-2">
      <HubKpis />
      <CardShell title="Data Principal Access Rights" accent="#EC4899">
        <ul className="space-y-1.5 text-[11px]">
          <li className="flex items-center justify-between gap-2">
            <span className="text-[#374151]">#1042 Access request</span>
            <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">2d left</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="text-[#374151]">#1039 Deletion request</span>
            <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">Overdue</span>
          </li>
        </ul>
        <p className="mt-2 text-[11px] font-semibold text-[#2563EB]">View all requests →</p>
      </CardShell>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="space-y-2">
      <HubKpis />
      <CardShell title="Privacy Center" accent="#3B82F6">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg bg-[#F8FAFC] p-2 text-center">
            <p className="text-[9px] uppercase tracking-wide text-[#6B7280]">ROPA</p>
            <p className="mt-0.5 text-base font-bold text-[#111827]">318</p>
          </div>
          <div className="rounded-lg bg-[#F8FAFC] p-2 text-center">
            <p className="text-[9px] uppercase tracking-wide text-[#6B7280]">Notices</p>
            <p className="mt-0.5 text-base font-bold text-[#111827]">28</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-[#6B7280]">Data → Purpose → Process → Vendor</p>
        <p className="mt-1.5 text-[11px] font-semibold text-[#2563EB]">Go to Privacy Center →</p>
      </CardShell>
    </div>
  );
}

function DashboardOverview() {
  return (
    <>
      <h3 className="text-[13px] font-bold tracking-tight text-[#111827]">Dashboard Overview</h3>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#E5E7EB] bg-white px-2 py-1.5 shadow-sm">
            <p className="text-[9px] font-medium uppercase tracking-[0.04em] text-[#6B7280]">{stat.label}</p>
            <p className="mt-0.5 text-[14px] font-bold tracking-tight text-[#111827]">{stat.value}</p>
            <p className="mt-0.5 text-[9px] font-medium text-[#16A34A]">{stat.delta}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-2 pb-0.5">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-sm sm:p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-[#111827]">Consent Rate Over Time</p>
          <p className="text-[9px] text-[#9CA3AF]">Last 30 days</p>
        </div>
        <div className="relative mt-1.5 h-[92px] sm:h-[108px]">
          <svg viewBox="0 0 420 160" className="h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="cf-line-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C4A7" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#00C4A7" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 60, 90, 120].map((y) => (
              <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="#E5E7EB" strokeWidth="1" />
            ))}
            <path
              d="M0 118 C 40 110, 70 95, 105 88 C 140 81, 165 96, 200 78 C 235 60, 260 70, 295 52 C 330 34, 360 48, 420 28 L 420 160 L 0 160 Z"
              fill="url(#cf-line-fill)"
            />
            <path
              d="M0 118 C 40 110, 70 95, 105 88 C 140 81, 165 96, 200 78 C 235 60, 260 70, 295 52 C 330 34, 360 48, 420 28"
              fill="none"
              stroke="#00C4A7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="295" cy="52" r="5" fill="#00C4A7" stroke="white" strokeWidth="2" />
          </svg>
          <div className="absolute left-[36%] top-1 hidden -translate-x-1/2 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[9px] text-[#374151] shadow-md sm:block">
            <span className="font-medium text-[#111827]">May 12, 2025</span>
            <span className="text-[#9CA3AF]"> • </span>
            Consent Rate: <span className="font-semibold text-[#00C4A7]">92.6%</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 hidden w-[min(150px,44%)] rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)] @[560px]:block">
        <p className="text-[11px] font-semibold text-[#111827]">Consent Status</p>
        <div className="mt-1.5 flex items-center gap-2">
          <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0" aria-hidden="true">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#E6F9F5" strokeWidth="5" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#00C4A7" strokeWidth="5" strokeDasharray="60.5 27.5" strokeDashoffset="0" transform="rotate(-90 18 18)" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="5" strokeDasharray="12.5 75.5" strokeDashoffset="-60.5" transform="rotate(-90 18 18)" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="5" strokeDasharray="8 80" strokeDashoffset="-73" transform="rotate(-90 18 18)" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#22C55E" strokeWidth="5" strokeDasharray="6.5 81.5" strokeDashoffset="-81" transform="rotate(-90 18 18)" />
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
    </>
  );
}

export function HomeProductPreview() {
  const [tab, setTab] = useState<PreviewTab>("dashboard");
  const titles: Record<PreviewTab, string> = {
    dashboard: "Dashboard Overview",
    consents: "Cookie Consents",
    preferences: "Consent & Preferences",
    integrations: "Third-Party Governance",
    reports: "Data Principal Requests",
    settings: "Privacy Center",
  };

  return (
    <div
      id="product"
      className="home-fade-item relative mx-auto w-full min-w-0 max-w-[640px] overflow-x-clip lg:max-w-none"
      aria-label="Consent Guru dashboard preview"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] opacity-80 sm:-inset-4 lg:-inset-8"
        style={{
          background:
            "radial-gradient(ellipse at 70% 30%, rgba(0,196,167,0.18), transparent 55%), radial-gradient(ellipse at 30% 80%, rgba(11,44,74,0.12), transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div className="@container relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <div className="grid min-w-0 md:grid-cols-[minmax(0,8.25rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)]">
          <aside className="hidden border-r border-[#EEF2F7] bg-[#FAFBFC] p-2 md:block">
            <div className="mb-3 px-1 pt-0.5">
              <BrandLogo tone="on-light" height={22} className="max-w-full" />
            </div>
            <ul className="space-y-0.5">
              {TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={[
                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        active ? "bg-[#E6F9F5] text-[#00C4A7]" : "text-[#6B7280] hover:bg-[#F3F4F6]",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                          active ? "bg-[#00C4A7]" : "bg-[#D1D5DB]",
                        ].join(" ")}
                      />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="relative min-h-[14rem] min-w-0 bg-[#F8FAFC] p-2 min-[400px]:p-2.5 lg:min-h-[15rem] sm:p-3">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]" aria-hidden="true">
              <BrandLogo markOnly tone="on-light" height={110} className="max-h-[36%] max-w-[min(150px,50%)]" />
            </div>
            <div className="relative z-[1] min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3 md:hidden">
              <BrandLogo tone="on-light" height={20} />
            </div>
            <div className="mb-2 flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain md:hidden">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={[
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    tab === item.id ? "bg-[#E6F9F5] text-[#00C4A7]" : "bg-white text-[#6B7280]",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div key={tab} className="preview-tab-pane min-w-0">
            {tab !== "dashboard" && (
              <h3 className="mb-2 text-[13px] font-bold tracking-tight text-[#111827]">{titles[tab]}</h3>
            )}
            {tab === "dashboard" && <DashboardOverview />}
            {tab === "consents" && <ConsentsView />}
            {tab === "preferences" && <PreferencesView />}
            {tab === "integrations" && <IntegrationsView />}
            {tab === "reports" && <ReportsView />}
            {tab === "settings" && <SettingsView />}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
