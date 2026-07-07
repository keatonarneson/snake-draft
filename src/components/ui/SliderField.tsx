import React from "react";

interface SliderFieldProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueLabel?: React.ReactNode;
  compact?: boolean;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueLabel,
  compact = false,
}: SliderFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? "4px" : "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: compact ? "0.7rem" : "0.75rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>
          {valueLabel ?? `${value.toFixed(1)}x`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        style={{
          width: "100%",
          accentColor: "var(--primary)",
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.1)",
          outline: "none",
        }}
      />
    </div>
  );
}
