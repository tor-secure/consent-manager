import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { bootstrapCurrentContext } from "@/lib/bootstrap-current-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NotificationBell } from "@/components/notifications/notification-bell";

function SearchBar() {
  return (
    <div className="relative hidden lg:block w-[320px] xl:w-[420px]">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        placeholder="Search..."
        className="w-full h-11 rounded-2xl bg-white soft-shadow pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
    </div>
  );
}

function HeaderIconButton({
  children,
  ariaLabel,
  badge,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 soft-shadow hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
    >
      {children}
      {badge && (
        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
      )}
    </button>
  );
}

function HeaderLeft() {
  return (
    <>
      <div className="lg:hidden flex items-center gap-2.5 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-md shadow-indigo-500/25">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" />
            <path d="M9 12l2 2 4-4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="hidden sm:block text-base font-bold text-slate-900 truncate">Consent Manager</span>
      </div>
      <div className="lg:ml-0">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "h-10 rounded-2xl px-3.5 bg-white soft-shadow hover:bg-slate-50 transition-all duration-200 gap-2.5 border-0",
              organizationSwitcherIconBox: "text-indigo-500",
              organizationSwitcherTriggerIcon: "text-slate-500",
            },
          }}
        />
      </div>
    </>
  );
}

function HeaderCenter() {
  return <SearchBar />;
}

function HeaderRight() {
  return (
    <div className="flex items-center gap-2 md:gap-3">
      <NotificationBell />

      <HeaderIconButton ariaLabel="Help">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </HeaderIconButton>

      <div className="h-8 w-px bg-slate-200/70 mx-1 hidden sm:block" />

      <UserButton
        appearance={{
          elements: {
            rootBox: "flex items-center",
            userButtonTrigger:
              "h-11 rounded-2xl px-2 py-1.5 bg-white soft-shadow hover:bg-slate-50 transition-all duration-200 gap-2.5 border-0",
            userButtonAvatarBox: "h-8 w-8 rounded-xl",
            userButtonOuterIdentifier: "hidden sm:block",
          },
        }}
        showName={true}
      />
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let context: Awaited<ReturnType<typeof bootstrapCurrentContext>>;

  try {
    context = await bootstrapCurrentContext();
  } catch {
    redirect("/sign-in");
  }

  if (!context.organization) {
    redirect("/create-organization");
  }

  return (
    <DashboardShell
      headerLeft={<HeaderLeft />}
      headerCenter={<HeaderCenter />}
      headerRight={<HeaderRight />}
    >
      {children}
    </DashboardShell>
  );
}
