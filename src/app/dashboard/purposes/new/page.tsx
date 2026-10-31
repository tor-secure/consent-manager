import { CreatePageHeader } from "@/components/dashboard/create-page-header";
import { CreatePurposeForm } from "@/components/purposes/create-purpose-form";

// Auth + bootstrap guaranteed by the dashboard layout.
export default function NewPurposePage() {
  return (
    <div className="page-wrap space-y-5 sm:space-y-6 lg:space-y-8">
      <CreatePageHeader
        backHref="/dashboard/purposes"
        backLabel="Purposes"
        current="New purpose"
        title="Create purpose"
        description="Start from a template, fill in purpose details, and add DPDP notice information."
      />

      <CreatePurposeForm />
    </div>
  );
}
