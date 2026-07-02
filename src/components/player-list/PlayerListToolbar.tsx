import styles from "./PlayerListToolbar.module.css";

interface PlayerListToolbarProps {
  positionFilterOptions: string[];
  searchTerm: string;
  selectedPosition: string;
  setSearchTerm: (value: string) => void;
  setSelectedPosition: (value: string) => void;
  setShowDrafted: (value: boolean) => void;
  showDrafted: boolean;
}

export function PlayerListToolbar({
  positionFilterOptions,
  searchTerm,
  selectedPosition,
  setSearchTerm,
  setSelectedPosition,
  setShowDrafted,
  showDrafted,
}: PlayerListToolbarProps) {
  return (
    <>
      <div className={styles.tableHeaderActions}>
        <h3 className="cardTitle" style={{ margin: 0 }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Player Pool
        </h3>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showDrafted}
              onChange={() => setShowDrafted(!showDrafted)}
              style={{ accentColor: "var(--primary)" }}
            />
            Show Drafted
          </label>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search players by name, team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          {positionFilterOptions.map((pos) => (
            <button
              key={pos}
              className={`${styles.filterBtn} ${selectedPosition === pos ? styles.filterBtnActive : ""}`}
              onClick={() => setSelectedPosition(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
