import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={["field-input min-h-28 py-2.5", className].join(" ")}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
