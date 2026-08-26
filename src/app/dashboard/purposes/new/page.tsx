import Link from "next/link";
import { CreatePurposeForm } from "@/components/purposes/create-purpose-form";

// Auth + bootstrap guaranteed by the dashboard layout.
export default function NewPurposePage() {
  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
      >
        <Link href="/dashboard/purposes" className="hover:text-neutral-900">
          Purposes
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">New purpose</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Create purpose
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Purposes are shared across your organization and can be attached to
          any consent policy.
        </p>
      </div>

      <div className="max-w-2xl">
        <CreatePurposeForm />
      </div>
    </div>
  );
}
