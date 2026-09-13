"use client";

import {
  Children,
  isValidElement,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size" | "multiple" | "onChange" | "value" | "defaultValue"
> & {
  value?: string;
  defaultValue?: string;
  size?: "md" | "sm";
  searchable?: boolean;
  placeholder?: string;
  onChange?: (event: { target: { value: string; name: string }; currentTarget: { value: string; name: string } }) => void;
  children?: ReactNode;
};

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

function collectOptions(children: ReactNode): ComboboxOption[] {
  const options: ComboboxOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; label?: string }>(child)) return;
    const type = child.type;
    const props = child.props;
    if (type === "option") {
      const value = props.value !== undefined ? String(props.value) : textFromNode(props.children);
      options.push({ value, label: textFromNode(props.children).trim() || value });
      return;
    }
    if (type === "optgroup" || typeof type !== "string") {
      options.push(...collectOptions(props.children));
    }
  });
  return options;
}

export function Select({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  children,
  className = "",
  size = "md",
  searchable,
  placeholder,
  "aria-label": ariaLabel,
}: SelectProps) {
  const options = useMemo(() => collectOptions(children), [children]);
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string | undefined>(
    defaultValue !== undefined ? String(defaultValue) : undefined,
  );
  const current = controlled
    ? String(value)
    : (uncontrolled !== undefined ? uncontrolled : (options[0]?.value ?? ""));

  return (
    <Combobox
      id={id}
      name={name}
      value={current}
      onChange={(next) => {
        if (!controlled) setUncontrolled(next);
        onChange?.({
          target: { value: next, name: name ?? "" },
          currentTarget: { value: next, name: name ?? "" },
        });
      }}
      options={options}
      disabled={disabled}
      required={required}
      searchable={searchable}
      size={size}
      className={className}
      placeholder={placeholder ?? "Select"}
      aria-label={ariaLabel}
    />
  );
}
