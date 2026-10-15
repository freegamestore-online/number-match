import { cellAt, isFilled, readingIndex, COLS, type Grid, type Pos } from "./grid";

/**
 * Adjacency for a pair of cells. Two cells are adjacent when every cell
 * between them on one line is cleared. The lines are:
 *
 * - horizontal: the same row;
 * - vertical: the same column;
 * - diagonal: the same diagonal (equal row and column distance);
 * - reading order: `b` comes after `a` in the next row or later, so the
 *   pair runs across a row end. Cells between them in reading order must be cleared.
 *
 * A cell is never adjacent to itself.
 */
export function isAdjacent(grid: Grid, a: Pos, b: Pos): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  if (cellAt(grid, a) === undefined || cellAt(grid, b) === undefined) return false;

  const [first, second] = readingIndex(a) < readingIndex(b) ? [a, b] : [b, a];
  const dRow = second.row - first.row;
  const dCol = second.col - first.col;

  if (dRow === 0) return clearedBetweenInReadingOrder(grid, first, second);
  if (dCol === 0) return clearedBetweenOnStep(grid, first, second, 0, 1);
  if (Math.abs(dRow) === Math.abs(dCol)) {
    return clearedBetweenOnStep(grid, first, second, Math.sign(dCol), Math.sign(dRow));
  }
  // Across a row end: the pair spans into a later row. Only reading order
  // between them matters, so the rule works for next-row pairs.
  return clearedBetweenInReadingOrder(grid, first, second);
}

/** True when every cell strictly between `from` and `to` in reading order is cleared. */
function clearedBetweenInReadingOrder(grid: Grid, from: Pos, to: Pos): boolean {
  const start = readingIndex(from);
  const end = readingIndex(to);
  for (let i = start + 1; i < end; i++) {
    const pos = { row: Math.floor(i / COLS), col: i % COLS };
    if (isFilled(grid, pos)) return false;
  }
  return true;
}

/** True when every cell strictly between `from` and `to` on a step line is cleared. */
function clearedBetweenOnStep(grid: Grid, from: Pos, to: Pos, dCol: number, dRow: number): boolean {
  let row = from.row + dRow;
  let col = from.col + dCol;
  while (row !== to.row || col !== to.col) {
    if (isFilled(grid, { row, col })) return false;
    row += dRow;
    col += dCol;
  }
  return true;
}
