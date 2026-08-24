import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CreateWebsiteForm } from "@/components/websites/create-website-form";

export default async function NewWebsitePage() {
  const { isAuthenticated, orgId } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/create-organization");
  }

  return (
    <main className="p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">Add Website</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Register a website with your Consent Management Platform.
        </p>

        <div className="mt-8">
          <CreateWebsiteForm />
        </div>
      </div>
    </main>
  );
}