"use client";

import { forwardRef, useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";

export type SearchInputProps = {
  label?: string;
  className?: string;
  trailing?: ReactNode;
  onClear?: () => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      label,
      className = "",
      trailing,
      onClear,
      id,
      disabled,
      onChange,
      placeholder = "Search",
      ...props
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement>(null);

    function setRefs(node: HTMLInputElement | null) {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }

    function handleClear() {
      const el = innerRef.current;
      if (el && props.value === undefined) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
        descriptor?.set?.call(el, "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      onClear?.();
      onChange?.({
        target: { value: "" },
        currentTarget: el ?? ({ value: "" } as HTMLInputElement),
      } as React.ChangeEvent<HTMLInputElement>);
      el?.focus();
    }

    return (
      <div className={["search-bar", disabled ? "is-disabled" : "", className].filter(Boolean).join(" ")}>
        {label ? (
          <label htmlFor={inputId} className="sr-only">
            {label}
          </label>
        ) : null}
        <button
          type="button"
          className="search-bar-icon"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          onClick={() => innerRef.current?.focus()}
        >
          <svg width="17" height="16" fill="none" viewBox="0 0 17 16" aria-hidden="true">
            <path
              d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
              stroke="currentColor"
              strokeWidth="1.333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          {...props}
          ref={setRefs}
          id={inputId}
          type="search"
          disabled={disabled}
          placeholder={placeholder}
          onChange={onChange}
          className="search-bar-field"
        />
        <button
          type="button"
          className="search-bar-reset"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {trailing}
      </div>
    );
  },
);
