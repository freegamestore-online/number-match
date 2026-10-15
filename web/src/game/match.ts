import { isAdjacent } from "./adjacency";
import { ADD_ALLOWANCE, cellAt, createGrid, randomRow, type Cell, type Grid, type Pos, type Random } from "./grid";

/** Points for one matched pair. */
export const MATCH_POINTS = 10;

/** The sum that also makes a pair match. */
export const MATCH_SUM = 10;

/** Game state. The grid is the only board; `selected` is the first tap of a pair. */
export interface GameState {
  grid: Grid;
  selected: Pos | null;
  score: number;
  addsLeft: number;
}

/** A new game: an initial grid, nothing selected, full allowance. */
export function createGame(random: Random = Math.random): GameState {
  return { grid: createGrid(undefined, random), selected: null, score: 0, addsLeft: ADD_ALLOWANCE };
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

/**
 * Append one row of random digits. Does nothing when no allowance is left.
 */
export function addNumbers(state: GameState, random: Random = Math.random): GameState {
  if (state.addsLeft <= 0) return state;
  return { ...state, grid: [...state.grid, randomRow(random)], addsLeft: state.addsLeft - 1 };
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
