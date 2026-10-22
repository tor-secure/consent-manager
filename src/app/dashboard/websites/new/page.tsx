import { CreateWebsiteForm } from "@/components/websites/create-website-form";

// Auth + bootstrap is handled by the parent dashboard layout.
export default function NewWebsitePage() {
  return (
    <div className="page-wrap flex min-h-[70vh] items-center justify-center p-4 md:p-6 xl:p-10">
      <CreateWebsiteForm cancelHref="/dashboard/websites" />
    </div>
  );
}
