import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { bootstrapCurrentContext } from "@/lib/bootstrap-current-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const context = await bootstrapCurrentContext();

    // User is authenticated, but has no active organization.
    if (!context.organization) {
      redirect("/create-organization");
    }

    return (
      <div className="min-h-screen">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <OrganizationSwitcher />

          <UserButton />
        </header>

        <div className="flex">
          <aside className="hidden w-64 border-r md:block">
            <nav className="p-4">
              <div className="text-sm font-medium">
                Dashboard
              </div>
            </nav>
          </aside>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard bootstrap failed:", error);

    redirect("/sign-in");
  }
}