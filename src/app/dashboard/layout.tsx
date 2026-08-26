import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { bootstrapCurrentContext } from "@/lib/bootstrap-current-context";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let context: Awaited<ReturnType<typeof bootstrapCurrentContext>>;

  try {
    context = await bootstrapCurrentContext();
  } catch {
    // bootstrapCurrentContext throws when the Clerk session is missing or
    // the Clerk API call fails. Either way the user must sign in again.
    redirect("/sign-in");
  }

  // Authenticated but no active organization — send to org creation.
  if (!context.organization) {
    redirect("/create-organization");
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-5">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "flex items-center",
            },
          }}
        />

        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserButton />
        </div>
      </header>

      {/* Below header: sidebar + main */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar — hidden on small screens, visible md+ */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r bg-white md:block">
          <SidebarNav />
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          {children}
        </main>
      </div>
    </div>
  );
}
