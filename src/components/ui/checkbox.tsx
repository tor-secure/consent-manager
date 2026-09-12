"use client";

import * as React from "react";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  children?: React.ReactNode;
  className?: string;
  align?: "center" | "start";
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ children, className = "", align = "center", id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <span
        className={["cmp-checkbox", className].filter(Boolean).join(" ")}
        data-align={align}
        data-disabled={disabled ? "" : undefined}
      >
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          className="cmp-checkbox-input"
        />
        <label htmlFor={inputId} className="cmp-checkbox-control">
          <span className="cmp-checkbox-box" aria-hidden="true">
            <svg viewBox="0 0 12 10" height="10" width="12">
              <polyline points="1.5 6 4.5 9 10.5 1" />
            </svg>
          </span>
          {children ? <span className="cmp-checkbox-label">{children}</span> : null}
        </label>
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
