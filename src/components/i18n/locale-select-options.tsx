import { LOCALE_OPTIONS } from "@/lib/i18n/locale-registry";

export function LocaleSelectOptions({ includeCurrent }: { includeCurrent?: string }) {
  const codes = new Set(LOCALE_OPTIONS.map((entry) => entry.code));
  return (
    <>
      {includeCurrent && !codes.has(includeCurrent) ? (
        <option value={includeCurrent}>{includeCurrent}</option>
      ) : null}
      {LOCALE_OPTIONS.map((entry) => (
        <option key={entry.code} value={entry.code}>
          {entry.label}
        </option>
      ))}
    </>
  );
}
