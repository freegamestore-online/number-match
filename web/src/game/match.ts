import { isAdjacent } from "./adjacency";
import { cellAt, type Cell, type Grid, type Pos } from "./grid";

/** Points for one matched pair. */
export const MATCH_POINTS = 10;

/** The sum that also makes a pair match. */
export const MATCH_SUM = 10;

/**
 * Game state. `grid` is the board; `selected` is the first tap of a pair.
 * `reserve` holds the rows that "Add numbers" releases, in order. It is fixed
 * by the deal, so the same deal always plays the same way.
 */
export interface GameState {
  grid: Grid;
  selected: Pos | null;
  score: number;
  reserve: Cell[][];
}

/** A new game from a deal's initial grid and reserved rows. Nothing selected, score zero. */
export function startGame(grid: Grid, reserve: Cell[][]): GameState {
  return { grid, selected: null, score: 0, reserve };
}

/** True when two digits match: equal values, or summing to ten. */
export function valuesMatch(a: number, b: number): boolean {
  return a === b || a + b === MATCH_SUM;
}

/** True when the two cells are distinct, both filled, value-matched and adjacent. */
export function isValidPair(grid: Grid, a: Pos, b: Pos): boolean {
  const first = cellAt(grid, a);
  const second = cellAt(grid, b);
  if (first === undefined || second === undefined || first === null || second === null) return false;
  return valuesMatch(first, second) && isAdjacent(grid, a, b);
}

/**
 * Handle a tap on `pos`. The first tap selects a filled cell. A second tap on
 * the same cell clears the selection. A second tap on a valid partner clears
 * both cells and scores. Any other second tap moves the selection to the new cell.
 */
export function tapCell(state: GameState, pos: Pos): GameState {
  const cell = cellAt(state.grid, pos);
  if (cell === undefined || cell === null) return { ...state, selected: null };

  if (state.selected === null) return { ...state, selected: pos };
  if (state.selected.row === pos.row && state.selected.col === pos.col) {
    return { ...state, selected: null };
  }
  if (!isValidPair(state.grid, state.selected, pos)) return { ...state, selected: pos };

  const grid = state.grid.map((row) => row.slice());
  grid[state.selected.row]![state.selected.col] = null;
  grid[pos.row]![pos.col] = null;
  return { ...state, grid, selected: null, score: state.score + MATCH_POINTS };
}

/** Times "Add numbers" can still be used. */
export function addsLeft(state: GameState): number {
  return state.reserve.length;
}

/** Append the next reserved row. Does nothing when no reserve is left. */
export function addNumbers(state: GameState): GameState {
  const [next, ...rest] = state.reserve;
  if (next === undefined) return state;
  return { ...state, grid: [...state.grid, next], reserve: rest };
}

/** True when no reserved row is left to add and no two cells match. */
export function isGameOver(state: GameState): boolean {
  return addsLeft(state) === 0 && !hasValidPair(state.grid);
}

/** True when at least one legal pair exists on the grid. */
export function hasValidPair(grid: Grid): boolean {
  const cells: Pos[] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => cell !== null && cells.push({ row: r, col: c })));
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (isValidPair(grid, cells[i]!, cells[j]!)) return true;
    }
  }
  return false;
}

/** True when every cell in the row is cleared. */
export function isEmptyRow(row: readonly Cell[]): boolean {
  return row.every((cell) => cell === null);
}

/**
 * Remove fully cleared rows. The rows below move up, so the grid shrinks. A
 * selection survives: its row moves up by the number of removed rows above it.
 */
export function collapseEmptyRows(state: GameState): GameState {
  const grid = state.grid.filter((row) => !isEmptyRow(row));
  if (grid.length === state.grid.length) return state;
  const selected = state.selected && {
    ...state.selected,
    row: state.selected.row - state.grid.slice(0, state.selected.row).filter(isEmptyRow).length,
  };
  return { ...state, grid, selected };
}
