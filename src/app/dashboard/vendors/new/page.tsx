import Link from "next/link";
import { CreateVendorForm } from "@/components/vendors/create-vendor-form";

export default function NewVendorPage() {
  return (
    <div className="page-wrap">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/dashboard/vendors" className="hover:text-neutral-900">
          Vendors
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">New vendor</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Create vendor</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Vendors are shared across your organization and can be linked to consent purposes.
        </p>
      </div>

      <div className="max-w-2xl">
        <CreateVendorForm />
      </div>
    </div>
  );
}
