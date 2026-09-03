import Link from "next/link";

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
      <select name="website" defaultValue={selected ?? ""} className="field-input h-10 min-w-[12rem]">
        {websites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
      <button type="submit" className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white">
        View
      </button>
      <Link href={action} className="inline-flex h-10 items-center px-3 text-sm text-[var(--muted-foreground)]">
        Reset
      </Link>
    </form>
  );
}
