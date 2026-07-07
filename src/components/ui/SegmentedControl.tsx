import React from "react";

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  accent?: "primary" | "success" | "accent";
  fill?: boolean;
}

const accentTokens = {
  primary: "var(--primary)",
  success: "var(--success)",
  accent: "var(--accent)",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  accent = "primary",
  fill = true,
}: SegmentedControlProps<T>) {
  const activeColor = accentTokens[accent];

  return (
    <div
      style={{
        display: "flex",
        background: "rgba(0,0,0,0.15)",
        padding: "2px",
        borderRadius: "6px",
        border: "1px solid var(--glass-border)",
      }}
    >
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            style={{
              flex: fill ? 1 : undefined,
              padding: "7px 8px",
              fontSize: "0.75rem",
              borderRadius: "4px",
              border: "none",
              background: isActive ? activeColor : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              cursor: disabled ? "not-allowed" : "pointer",
              fontWeight: isActive ? 700 : 500,
              opacity: disabled ? 0.55 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
