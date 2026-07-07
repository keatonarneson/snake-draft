import React from "react";

interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  compact?: boolean;
}

export function Field({ label, children, hint, compact = false }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? "2px" : "6px" }}>
      <label
        style={{
          fontSize: compact ? "0.7rem" : "0.8rem",
          color: "var(--text-secondary)",
          fontWeight: compact ? 400 : 600,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", lineHeight: 1.35 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

type NumberFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  label: React.ReactNode;
  value: number;
  onValueChange: (value: number) => void;
  parse?: "int" | "float";
  compact?: boolean;
};

export function NumberField({
  label,
  value,
  onValueChange,
  parse = "int",
  compact = false,
  style,
  ...inputProps
}: NumberFieldProps) {
  return (
    <Field label={label} compact={compact}>
      <input
        {...inputProps}
        className={`premium-input ${inputProps.className || ""}`.trim()}
        type="number"
        value={value}
        onChange={(event) => {
          const next = parse === "float"
            ? parseFloat(event.target.value)
            : parseInt(event.target.value, 10);
          onValueChange(Number.isFinite(next) ? next : 0);
        }}
        style={{
          width: "100%",
          ...(compact ? { padding: "4px 8px", fontSize: "0.8rem" } : null),
          ...style,
        }}
      />
    </Field>
  );
}
