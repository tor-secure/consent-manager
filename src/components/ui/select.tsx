import * as React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <select ref={ref} className={["field-input", className].join(" ")} {...props}>
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";
