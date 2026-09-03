import Link from "next/link";
import { CreatePurposeForm } from "@/components/purposes/create-purpose-form";

// Auth + bootstrap guaranteed by the dashboard layout.
export default function NewPurposePage() {
  return (
    <div className="page-wrap">
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
          Start from a ready-made category such as analytics or advertising, then customise the notice text.
        </p>
      </div>

      <div className="max-w-3xl">
        <CreatePurposeForm />
      </div>
    </div>
  );
}
