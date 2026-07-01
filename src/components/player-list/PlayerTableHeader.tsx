import { SortField, SortOrder } from "./usePlayerListTable";

interface PlayerTableHeaderProps {
  handleSort: (field: SortField) => void;
  sortField: SortField;
  sortOrder: SortOrder;
}

function sortMarker(field: SortField, sortField: SortField, sortOrder: SortOrder) {
  if (sortField !== field) return "";
  return sortOrder === "asc" ? "▲" : "▼";
}

export function PlayerTableHeader({ handleSort, sortField, sortOrder }: PlayerTableHeaderProps) {
  return (
    <thead>
      <tr>
        <th style={{ width: "40px" }}>Info</th>
        <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
          Player {sortMarker("name", sortField, sortOrder)}
        </th>
        <th onClick={() => handleSort("adp")} style={{ cursor: "pointer", width: "110px" }}>
          ADP (Range) {sortMarker("adp", sortField, sortOrder)}
        </th>
        <th style={{ width: "90px" }}>Market $</th>
        <th onClick={() => handleSort("value")} style={{ cursor: "pointer", width: "90px" }}>
          Auction $ {sortMarker("value", sortField, sortOrder)}
        </th>
        <th style={{ width: "160px" }}>Projections</th>
        <th onClick={() => handleSort("pReturn")} style={{ cursor: "pointer", width: "100px" }}>
          Return Prob {sortMarker("pReturn", sortField, sortOrder)}
        </th>
        <th onClick={() => handleSort("score")} style={{ cursor: "pointer", width: "100px" }}>
          Score {sortMarker("score", sortField, sortOrder)}
        </th>
        <th style={{ width: "90px" }}>Action</th>
      </tr>
    </thead>
  );
}
