"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxBase = {
  id?: string;
  name?: string;
  options: ComboboxOption[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  searchable?: boolean;
  size?: "md" | "sm";
  className?: string;
  "aria-label"?: string;
};

type ComboboxProps = ComboboxBase &
  (
    | {
        multiple?: false;
        value: string;
        onChange: (value: string) => void;
      }
    | {
        multiple: true;
        value: string[];
        onChange: (value: string[]) => void;
      }
  );

function clientMountedSubscribe() {
  return () => undefined;
}

function clientMountedSnapshot() {
  return true;
}

function serverMountedSnapshot() {
  return false;
}

export function Combobox(props: ComboboxProps) {
  const {
    id,
    name,
    options,
    disabled = false,
    required = false,
    placeholder = "Select",
    searchPlaceholder = "Search",
    emptyText = "No matches",
    searchable,
    size = "md",
    className = "",
    multiple = false,
  } = props;
  const ariaLabel = props["aria-label"];
  const selectedValues = useMemo(() => {
    if (props.multiple) return props.value;
    return [props.value];
  }, [props.multiple, props.value]);

  const autoId = useId();
  const listId = `${autoId}-list`;
  const triggerId = id ?? `${autoId}-trigger`;
  const searchId = `${autoId}-search`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(clientMountedSubscribe, clientMountedSnapshot, serverMountedSnapshot);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const showSearch = searchable ?? options.length >= 8;
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle),
    );
  }, [options, query]);

  const boundedActiveIndex =
    filtered.length === 0 ? 0 : Math.min(Math.max(activeIndex, 0), filtered.length - 1);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportPad = 8;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const preferBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(320, Math.max(160, preferBelow ? spaceBelow - gap : spaceAbove - gap));
    const width = Math.max(rect.width, 240);
    const left = Math.min(rect.left, window.innerWidth - width - viewportPad);
    const top = preferBelow
      ? rect.bottom + gap
      : Math.max(viewportPad, rect.top - gap - maxHeight);
    setCoords({ top, left: Math.max(viewportPad, left), width, maxHeight });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = window.requestAnimationFrame(() => {
      if (showSearch) searchRef.current?.focus();
      else panelRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setQuery("");
        triggerRef.current?.focus();
      }
    }
    function onReposition() {
      updatePosition();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function commitSingle(next: string) {
    if (!props.multiple) props.onChange(next);
  }

  function commitMultiple(next: string[]) {
    if (props.multiple) props.onChange(next);
  }

  function selectOption(option: ComboboxOption) {
    if (props.multiple) {
      const exists = selectedValues.includes(option.value);
      commitMultiple(exists ? selectedValues.filter((value) => value !== option.value) : [...selectedValues, option.value]);
      return;
    }
    commitSingle(option.value);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      const selectedIndex = filtered.findIndex((option) => selectedValues.includes(option.value));
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[boundedActiveIndex];
      if (option) selectOption(option);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
    }
  }

  useEffect(() => {
    if (!open) return;
    const active = panelRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [boundedActiveIndex, open, filtered]);

  const triggerLabel = selectedOptions.length === 0
    ? placeholder
    : selectedOptions.length === 1
      ? selectedOptions[0]!.label
      : `${selectedOptions.length} selected`;

  const panel =
    mounted && open && coords
      ? createPortal(
          <div
            ref={panelRef}
            className={["cmp-combobox-panel", showSearch ? "" : "is-plain"].filter(Boolean).join(" ")}
            tabIndex={showSearch ? undefined : -1}
            onKeyDown={showSearch ? undefined : onListKeyDown}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
          >
            {showSearch ? (
              <div className="cmp-combobox-search">
                <svg width="16" height="16" viewBox="0 0 17 16" fill="none" aria-hidden="true">
                  <path
                    d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
                    stroke="currentColor"
                    strokeWidth="1.333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={query}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls={listId}
                  aria-activedescendant={
                    filtered[boundedActiveIndex] ? `${listId}-opt-${boundedActiveIndex}` : undefined
                  }
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onListKeyDown}
                />
              </div>
            ) : null}
            <div className="cmp-combobox-list" id={listId} role="listbox" aria-labelledby={triggerId} aria-multiselectable={multiple || undefined}>
              {filtered.length === 0 ? (
                <p className="cmp-combobox-empty">{emptyText}</p>
              ) : (
                filtered.map((option, index) => {
                  const selectedOption = selectedValues.includes(option.value);
                  const active = index === boundedActiveIndex;
                  return (
                    <button
                      key={`${option.value}-${index}`}
                      type="button"
                      id={`${listId}-opt-${index}`}
                      role="option"
                      data-active={active ? "true" : undefined}
                      aria-selected={selectedOption}
                      className={[
                        "cmp-combobox-option",
                        selectedOption ? "is-selected" : "",
                        active ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                    >
                      <span>{option.label}</span>
                      {selectedOption ? (
                        <svg className="cmp-combobox-check" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={["cmp-combobox", className].filter(Boolean).join(" ")}>
      {name ? (
        multiple ? (
          selectedValues.map((entry) => (
            <input key={entry || "empty"} type="hidden" name={name} value={entry} />
          ))
        ) : (
          <input type="hidden" name={name} value={props.multiple ? "" : props.value} required={required} />
        )
      ) : required ? (
        <input type="hidden" value={selectedValues[0] ?? ""} required tabIndex={-1} aria-hidden="true" />
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className={["cmp-combobox-trigger", size === "sm" ? "is-sm" : ""].filter(Boolean).join(" ")}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => {
            const next = !current;
            if (next) {
              const selectedIndex = filtered.findIndex((option) => selectedValues.includes(option.value));
              setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
            } else {
              setQuery("");
            }
            return next;
          });
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={["cmp-combobox-value", selectedOptions.length ? "" : "is-placeholder"].filter(Boolean).join(" ")}>
          {triggerLabel}
        </span>
        <svg className="cmp-combobox-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {panel}
    </div>
  );
}
