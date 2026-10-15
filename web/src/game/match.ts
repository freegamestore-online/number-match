import { isAdjacent } from "./adjacency";
import { cellAt, type Cell, type Grid, type Pos } from "./grid";

/** Points for one matched pair. */
export const MATCH_POINTS = 10;

/** The sum that also makes a pair match. */
export const MATCH_SUM = 10;

/** Undo steps kept. Older steps fall off the end. */
export const UNDO_LIMIT = 200;

/** What undo restores: the board, the reserve and the score before one action. */
export interface Snapshot {
  grid: Grid;
  reserve: Cell[][];
  score: number;
}

/**
 * Game state. `grid` is the board; `selected` is the first tap of a pair.
 * `reserve` holds the rows that "Add numbers" releases, in order. It is fixed
 * by the deal, so the same deal always plays the same way.
 *
 * `history` is the undo stack, newest last. `hintSpent` is true once this
 * stage's hint has been shown; "Add numbers" starts a new stage. `hint` is the
 * pair being highlighted right now, if any.
 */
export interface GameState {
  grid: Grid;
  selected: Pos | null;
  score: number;
  reserve: Cell[][];
  history: Snapshot[];
  hintSpent: boolean;
  hint: [Pos, Pos] | null;
}

/** A new game from a deal's initial grid and reserved rows. Nothing selected, score zero. */
export function startGame(grid: Grid, reserve: Cell[][]): GameState {
  return { grid, selected: null, score: 0, reserve, history: [], hintSpent: false, hint: null };
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
  const hint = state.hint && isSamePair(state.hint, [state.selected, pos]) ? null : state.hint;
  return {
    ...state,
    grid,
    selected: null,
    score: state.score + MATCH_POINTS,
    hint,
    history: pushHistory(state),
  };
}

/** Times "Add numbers" can still be used. */
export function addsLeft(state: GameState): number {
  return state.reserve.length;
}

/** Append the next reserved row and start a new stage, which makes a new hint available. */
export function addNumbers(state: GameState): GameState {
  const [next, ...rest] = state.reserve;
  if (next === undefined) return state;
  return {
    ...state,
    grid: [...state.grid, next],
    reserve: rest,
    hintSpent: false,
    hint: null,
    history: pushHistory(state),
  };
}

/** Reverse the last match or added row. Restores the cleared cells and the reserve. */
export function undo(state: GameState): GameState {
  const previous = state.history[state.history.length - 1];
  if (previous === undefined) return state;
  return {
    ...state,
    grid: previous.grid,
    reserve: previous.reserve,
    score: previous.score,
    selected: null,
    hint: null,
    history: state.history.slice(0, -1),
  };
}

/**
 * Show a hint: highlight one legal pair. Costs the stage's hint, but dismissing
 * it with `dismissHint` gives it back. Does nothing when the hint is already spent
 * or no pair is legal.
 */
export function requestHint(state: GameState): GameState {
  if (state.hintSpent || state.hint) return state;
  const pair = findLegalPair(state.grid);
  if (!pair) return state;
  return { ...state, hint: pair, hintSpent: true };
}

/** Close the highlighted hint without using it. The stage's hint is available again. */
export function dismissHint(state: GameState): GameState {
  if (!state.hint) return state;
  return { ...state, hint: null, hintSpent: false };
}

/** The first legal pair in reading order, or null when no pair is playable. */
export function findLegalPair(grid: Grid): [Pos, Pos] | null {
  const cells = filledCells(grid);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (isValidPair(grid, cells[i]!, cells[j]!)) return [cells[i]!, cells[j]!];
    }
  }
  return null;
}

/** True when no two cells match and no reserved row is left to add. */
export function isGameOver(state: GameState): boolean {
  return addsLeft(state) === 0 && !findLegalPair(state.grid);
}

/** True when at least one legal pair exists on the grid. */
export function hasValidPair(grid: Grid): boolean {
  return findLegalPair(grid) !== null;
}

/** True when every cell on the board is cleared. */
export function isWon(state: GameState): boolean {
  return state.grid.every(isEmptyRow);
}

/** True when the row is fully cleared. */
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

function pushHistory(state: GameState): Snapshot[] {
  const snapshot: Snapshot = { grid: state.grid, reserve: state.reserve, score: state.score };
  return [...state.history, snapshot].slice(-UNDO_LIMIT);
}

function filledCells(grid: Grid): Pos[] {
  const cells: Pos[] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => cell !== null && cells.push({ row: r, col: c })));
  return cells;
}

function isSamePair(pair: [Pos, Pos], other: [Pos, Pos]): boolean {
  const same = (x: Pos, y: Pos) => x.row === y.row && x.col === y.col;
  return (same(pair[0], other[0]) && same(pair[1], other[1])) || (same(pair[0], other[1]) && same(pair[1], other[0]));
}
