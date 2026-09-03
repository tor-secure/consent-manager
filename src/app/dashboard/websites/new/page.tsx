import { CreatePageHeader, CreateFormShell } from "@/components/dashboard/create-page-header";
import { CreateWebsiteForm } from "@/components/websites/create-website-form";
import { WebsiteCreateAside } from "@/components/websites/website-create-aside";

// Auth + bootstrap is handled by the parent dashboard layout.
export default function NewWebsitePage() {
  return (
    <div className="page-wrap space-y-8">
      <CreatePageHeader
        backHref="/dashboard/websites"
        backLabel="Websites"
        current="Add website"
        title="Add website"
        description="Register a site so you can attach a consent policy and install the SDK snippet."
      />

      <CreateFormShell aside={<WebsiteCreateAside />}>
        <CreateWebsiteForm />
      </CreateFormShell>
    </div>
  );
}
