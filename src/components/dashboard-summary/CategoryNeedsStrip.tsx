"use client";

import React from "react";
import styles from "../DashboardSummary.module.css";

type RecommendationFocus =
  | "all"
  | "targets"
  | "hitters"
  | "pitchers"
  | `position:${string}`
  | `category:${string}`;

interface CategoryNeedSummaryItem {
  category: string;
  group: "Hit" | "Pit";
  need: number;
}

interface CategoryNeedsStripProps {
  categoryNeedSummary: CategoryNeedSummaryItem[];
  userRosterSize: number;
  setRecommendationFocus: (focus: RecommendationFocus) => void;
}

const getCategoryNeedLabel = (need: number) => {
  if (need >= 1.0) return "High";
  if (need >= 0.45) return "Medium";
  return "Light";
};

const getCategoryNeedColor = (need: number) => {
  if (need >= 1.0) return "var(--danger)";
  if (need >= 0.45) return "var(--warning)";
  return "var(--secondary)";
};

export function CategoryNeedsStrip({
  categoryNeedSummary,
  userRosterSize,
  setRecommendationFocus,
}: CategoryNeedsStripProps) {
  return (
    <div className={styles.categoryNeedsStrip}>
      <div className={styles.categoryNeedsHeader}>
        <span>Current Category Needs</span>
        <span>
          {userRosterSize === 0
            ? "Draft a player to start tracking needs"
            : categoryNeedSummary.length > 0
              ? "Based on roster pace vs targets"
              : "No clear category gaps yet"}
        </span>
      </div>
      {categoryNeedSummary.length > 0 && (
        <div className={styles.categoryNeedChips}>
          {categoryNeedSummary.map((item) => {
            const color = getCategoryNeedColor(item.need);
            return (
              <button
                key={item.category}
                type="button"
                className={styles.categoryNeedChip}
                onClick={() => setRecommendationFocus(`category:${item.category}`)}
                style={{ borderColor: color, color }}
                title={`${item.category} need: ${getCategoryNeedLabel(item.need)}`}
              >
                <span>{item.category}</span>
                <small>{getCategoryNeedLabel(item.need)}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { RecommendationFocus, CategoryNeedSummaryItem };
