"use client";

/**
 * 开关：标签在左、开关在右，参考右侧边样式图。
 * @author poetry
 */

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

export default function Toggle({
  label,
  checked,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: ToggleProps) {
  const uid = id ?? `toggle-${label.replace(/\s/g, "-")}`;
  return (
    <label
      htmlFor={uid}
      className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm text-text/90"
    >
      <span>{label}</span>
      <span className="relative inline-flex h-6 w-10 shrink-0">
        <input
          id={uid}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          className="peer sr-only"
        />
        <span className="block h-6 w-10 rounded-full bg-secondary/30 transition-colors duration-200 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
