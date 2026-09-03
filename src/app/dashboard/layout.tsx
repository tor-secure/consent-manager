import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { bootstrapCurrentContext } from "@/lib/bootstrap-current-context";
import { DashboardProviders } from "@/components/dashboard/dashboard-providers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHelpLink, DashboardSearch } from "@/components/dashboard/dashboard-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";

function HeaderLeft() {
  return (
    <div className="min-w-0 max-w-full">
      <OrganizationSwitcher
        appearance={{
          elements: {
            rootBox: "flex min-w-0 max-w-full items-center",
            organizationSwitcherTrigger:
              "h-10 max-w-[7.5rem] sm:max-w-[14rem] md:max-w-[16rem] lg:max-w-[18rem] truncate rounded-xl px-2 sm:px-3 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all duration-200 gap-2",
            organizationPreview: "min-w-0",
            organizationPreviewTextContainer: "min-w-0 truncate",
            organizationPreviewMainIdentifier: "truncate text-sm",
            organizationSwitcherTriggerIcon: "shrink-0 text-[var(--muted-foreground)]",
          },
        }}
      />
    </div>
  );
}

function HeaderCenter() {
  return <DashboardSearch />;
}

function HeaderRight() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <ThemeToggle className="h-10 w-10 lg:h-11 lg:w-11" />
      <NotificationBell />
      <DashboardHelpLink />
      <div className="mx-0.5 hidden h-8 w-px bg-[var(--border)] md:block" />
      <UserButton
        appearance={{
          elements: {
            rootBox: "flex items-center",
            userButtonTrigger:
              "h-10 lg:h-11 rounded-xl px-1.5 sm:px-2 py-1 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-all duration-200 gap-2",
            userButtonAvatarBox: "h-8 w-8 rounded-xl",
            userButtonOuterIdentifier: "hidden lg:block max-w-[7rem] truncate",
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
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const context = await bootstrapCurrentContext();

  if (!context.organization) {
    redirect("/create-organization");
  }

  return (
    <DashboardProviders>
      <DashboardShell
        headerLeft={<HeaderLeft />}
        headerCenter={<HeaderCenter />}
        headerRight={<HeaderRight />}
      >
        {children}
      </DashboardShell>
    </DashboardProviders>
  );
}
