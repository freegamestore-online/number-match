/** Number of columns in the grid. Every row has this many cells. */
export const COLS = 9;

/** Rows dealt when a game starts. */
export const INITIAL_ROWS = 5;

/** Times the player may append a row with "Add numbers". */
export const ADD_ALLOWANCE = 3;

/** A digit 1–9, or null for a cleared cell. */
export type Cell = number | null;

/** The board, top row first. Each row has COLS cells. */
export type Grid = Cell[][];

/** A cell address. */
export interface Pos {
  row: number;
  col: number;
}

/** A random source in [0, 1). Tests pass a fixed one. */
export type Random = () => number;

/** A random digit 1–9. */
export function randomDigit(random: Random = Math.random): number {
  return 1 + Math.floor(random() * 9);
}

/** A full row of random digits. */
export function randomRow(random: Random = Math.random): Cell[] {
  return Array.from({ length: COLS }, () => randomDigit(random));
}

/** A fresh grid of `rows` random rows. */
export function createGrid(rows: number = INITIAL_ROWS, random: Random = Math.random): Grid {
  return Array.from({ length: rows }, () => randomRow(random));
}

/** The cell at `pos`, or undefined if it lies outside the grid. */
export function cellAt(grid: Grid, pos: Pos): Cell | undefined {
  return grid[pos.row]?.[pos.col];
}

/** True when the cell holds a digit. */
export function isFilled(grid: Grid, pos: Pos): boolean {
  const cell = cellAt(grid, pos);
  return cell !== undefined && cell !== null;
}

/** Index of `pos` in reading order (row by row, left to right). */
export function readingIndex(pos: Pos): number {
  return pos.row * COLS + pos.col;
}
