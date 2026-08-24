import Link from "next/link";

export default function WebsitesPage() {
  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Websites</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the websites connected to your Consent Management Platform.
          </p>
        </div>

        <Link
          href="/dashboard/websites/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Add Website
        </Link>
      </div>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <h2 className="text-lg font-medium">No websites yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first website to start configuring consent management.
        </p>

        <Link
          href="/dashboard/websites/new"
          className="mt-4 inline-block rounded-md border px-4 py-2 text-sm"
        >
          Add your first website
        </Link>
      </div>
    </main>
  );
}