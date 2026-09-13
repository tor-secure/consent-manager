import Link from "next/link";
import { Select } from "@/components/ui/select";

export function WebsiteFilter({
  action,
  websites,
  selected,
}: {
  action: string;
  websites: Array<{ id: string; name: string }>;
  selected?: string;
}) {
  return (
    <form className="mb-4 flex flex-wrap gap-2" action={action}>
      <Select name="website" defaultValue={selected ?? ""} className="min-w-[12rem]">
        {websites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </Select>
      <button type="submit" className="btn btn-primary">
        View
      </button>
      <Link href={action} className="inline-flex h-10 items-center px-3 text-sm text-[var(--muted-foreground)]">
        Reset
      </Link>
    </form>
  );
}
