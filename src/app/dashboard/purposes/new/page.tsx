import { CreatePageHeader, CreateFormShell } from "@/components/dashboard/create-page-header";
import { CreatePurposeForm } from "@/components/purposes/create-purpose-form";

// Auth + bootstrap guaranteed by the dashboard layout.
export default function NewPurposePage() {
  return (
    <div className="page-wrap space-y-8">
      <CreatePageHeader
        backHref="/dashboard/purposes"
        backLabel="Purposes"
        current="New purpose"
        title="Create purpose"
        description="Start from a ready-made category such as analytics or advertising, then customise the notice text."
      />

      <CreateFormShell>
        <CreatePurposeForm />
      </CreateFormShell>
    </div>
  );
}
