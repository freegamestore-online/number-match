import { COLS, type Grid } from "../game/grid";

/**
 * Build a grid from text rows. A digit is a filled cell and `.` is a cleared
 * cell. Each row must have COLS characters, so tests read like the board.
 */
export function parseGrid(rows: string[]): Grid {
  return rows.map((row) => {
    if (row.length !== COLS) throw new Error(`row must have ${COLS} cells: "${row}"`);
    return [...row].map((ch) => (ch === "." ? null : Number(ch)));
  });
}
