"use client";

import { useEffect, useRef, useState } from "react";

type PortalSelectOption = {
  value: string;
  label: string;
};

export function PortalSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly PortalSelectOption[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="field-input flex w-full items-center justify-between gap-3 text-left"
      >
        <span className={selected ? "text-[#0B2C4A]" : "text-[#9CA3AF]"}>
          {selected?.label ?? placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#6B7280]">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_12px_32px_-16px_rgba(11,44,74,0.35)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`block w-full px-4 py-2.5 text-left text-sm ${
                    isSelected
                      ? "bg-[#00CFFF] font-medium text-white"
                      : "text-[#111827] hover:bg-[#F3F6F8]"
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
