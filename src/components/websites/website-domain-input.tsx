"use client";

import { useState } from "react";

function normalizeTypedDomain(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

export function WebsiteDomainInput({
  id,
  value,
  onChange,
  placeholder = "example.com",
  required,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const host = value.trim();

  async function copyUrl() {
    if (!host || disabled) return;
    try {
      await navigator.clipboard.writeText(`https://${host}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="website-domain-input" data-disabled={disabled ? "" : undefined}>
      <span className="website-domain-input-prefix" aria-hidden="true">
        https://
      </span>
      <input
        id={id}
        className="website-domain-input-field"
        value={value}
        onChange={(event) => onChange(normalizeTypedDomain(event.target.value))}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
      />
      <button
        type="button"
        className="website-domain-input-copy"
        data-copied={copied ? "" : undefined}
        onClick={copyUrl}
        disabled={disabled || !host}
        aria-label={copied ? "Copied website URL" : "Copy website URL"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="website-domain-input-tooltip" role="status">
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
    </div>
  );
}
