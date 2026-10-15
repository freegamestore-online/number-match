import { collapseEmptyRows, isEmptyRow, isValidPair, startGame, tapCell, addNumbers, type GameState } from "./match";
import { type Cell, type Grid, type Pos } from "./grid";

/** One step of a solution: match two cells, or release the next reserved row. */
export type Move = { kind: "match"; a: Pos; b: Pos } | { kind: "add" };

export type SolveResult =
  | { status: "solved"; moves: Move[] }
  | { status: "unsolved" }
  | { status: "budget-exceeded"; explored: number };

/**
 * Depth-first search over the real engine rules. Matches go through `tapCell`
 * and collapse through `collapseEmptyRows`, so the solver cannot disagree with
 * the game. A visited set stops repeated states. Returns "unsolved" only when
 * the whole space has been searched, and "budget-exceeded" after `maxStates`
 * distinct states.
 */
export function solve(grid: Grid, reserve: Cell[][], maxStates = 200_000): SolveResult {
  const seen = new Set<string>();
  const moves: Move[] = [];
  let budgetHit = false;

  const search = (state: GameState): boolean => {
    if (state.grid.every(isEmptyRow)) return true;

    const key = stateKey(state);
    if (seen.has(key)) return false;
    if (seen.size >= maxStates) {
      budgetHit = true;
      return false;
    }
    seen.add(key);

    for (const [a, b] of validPairs(state.grid)) {
      const next = collapseEmptyRows(tapCell({ ...state, selected: a }, b));
      moves.push({ kind: "match", a, b });
      if (search(next)) return true;
      moves.pop();
      if (budgetHit) return false;
    }

    if (state.reserve.length > 0) {
      moves.push({ kind: "add" });
      if (search(addNumbers(state))) return true;
      moves.pop();
    }
    return false;
  };

  if (search(startGame(grid, reserve))) return { status: "solved", moves };
  if (budgetHit) return { status: "budget-exceeded", explored: seen.size };
  return { status: "unsolved" };
}

/** Every unordered pair of filled cells that is a legal match. */
function validPairs(grid: Grid): Array<[Pos, Pos]> {
  const cells: Pos[] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => cell !== null && cells.push({ row: r, col: c })));
  const pairs: Array<[Pos, Pos]> = [];
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (isValidPair(grid, cells[i]!, cells[j]!)) pairs.push([cells[i]!, cells[j]!]);
    }
  }
  return pairs;
}

/** Key for the visited set. Rows are ordered, so the grid string plus the reserve count is exact. */
function stateKey(state: GameState): string {
  return `${state.grid.map((row) => row.map((cell) => cell ?? ".").join("")).join("/")}|${state.reserve.length}`;
}
