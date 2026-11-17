"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; color?: string };

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(v) => onChange(v == null ? "" : String(v))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.color && (
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
            )}
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
