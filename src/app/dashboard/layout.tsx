import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
}