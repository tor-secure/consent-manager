import { CreatePageHeader } from "@/components/dashboard/create-page-header";
import { CreateVendorForm } from "@/components/vendors/create-vendor-form";

export default function NewVendorPage() {
  return (
    <div className="page-wrap space-y-5 sm:space-y-6 lg:space-y-8">
      <CreatePageHeader
        backHref="/dashboard/vendors"
        backLabel="Vendors"
        current="New vendor"
        title="Create vendor"
        description="Vendors are third parties that process personal data on your behalf and can be linked to consent purposes."
      />
      <CreateVendorForm />
    </div>
  );
}
