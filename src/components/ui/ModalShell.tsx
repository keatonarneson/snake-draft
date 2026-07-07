"use client";

import React from "react";
import { createPortal } from "react-dom";

interface ModalShellProps {
  isOpen: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  ariaLabel?: string;
  width?: string;
  maxWidth?: string;
  height?: string;
  maxHeight?: string;
  zIndex?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

export function ModalShell({
  isOpen,
  title,
  subtitle,
  icon,
  badge,
  ariaLabel,
  width = "min(520px, 100%)",
  maxWidth,
  height,
  maxHeight = "90vh",
  zIndex = 10000,
  children,
  footer,
  onClose,
  onKeyDown,
}: ModalShellProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal((
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 11, 17, 0.78)",
        backdropFilter: "blur(10px)",
        zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        style={{
          width,
          maxWidth,
          height,
          maxHeight,
          background: "#111827",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0 }}>
            {icon}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-outfit)" }}>
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              color: "var(--text-muted)",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1rem",
              flex: "0 0 auto",
            }}
          >
            x
          </button>
        </div>

        <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
