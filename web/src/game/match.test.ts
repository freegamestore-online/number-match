import { describe, expect, it } from "vitest";
import {
  addNumbers,
  addsLeft,
  collapseEmptyRows,
  dismissHint,
  hasValidPair,
  isGameOver,
  isValidPair,
  isWon,
  MATCH_POINTS,
  requestHint,
  startGame,
  tapCell,
  undo,
  UNDO_LIMIT,
  valuesMatch,
  type GameState,
} from "./match";
import { parseGrid } from "../test/grid";

// Undo, hints and the win check.

const at = (row: number, col: number) => ({ row, col });

const ROW = (digits: string) => [...digits].map(Number);

function stateOf(rows: string[], extra: Partial<GameState> = {}): GameState {
  return { grid: parseGrid(rows), selected: null, score: 0, reserve: [], history: [], hintSpent: false, hint: null, ...extra };
}

describe("valuesMatch", () => {
  it("matches equal digits", () => {
    expect(valuesMatch(4, 4)).toBe(true);
  });

  it("matches digits that sum to ten", () => {
    expect(valuesMatch(1, 9)).toBe(true);
    expect(valuesMatch(9, 1)).toBe(true);
    expect(valuesMatch(3, 7)).toBe(true);
  });

  it("rejects other pairs", () => {
    expect(valuesMatch(2, 3)).toBe(false);
    expect(valuesMatch(5, 6)).toBe(false);
  });
});

describe("isValidPair", () => {
  it("needs both cells filled", () => {
    const grid = parseGrid(["5.5......"]);
    expect(isValidPair(grid, at(0, 0), at(0, 2))).toBe(true);
    expect(isValidPair(grid, at(0, 0), at(0, 1))).toBe(false);
  });

  it("needs the values to match", () => {
    const grid = parseGrid(["12......."]);
    expect(isValidPair(grid, at(0, 0), at(0, 1))).toBe(false);
  });

  it("needs the cells to be adjacent", () => {
    const grid = parseGrid(["525......"]);
    expect(isValidPair(grid, at(0, 0), at(0, 2))).toBe(false);
  });

  it("rejects a cell paired with itself", () => {
    const grid = parseGrid(["5........"]);
    expect(isValidPair(grid, at(0, 0), at(0, 0))).toBe(false);
  });

  it("accepts a sum-to-ten pair across a row end", () => {
    const grid = parseGrid(["........6", "4........"]);
    expect(isValidPair(grid, at(0, 8), at(1, 0))).toBe(true);
  });
});

describe("tapCell", () => {
  it("selects a filled cell on the first tap", () => {
    const next = tapCell(stateOf(["5........"]), at(0, 0));
    expect(next.selected).toEqual(at(0, 0));
  });

  it("ignores a tap on a cleared cell", () => {
    const next = tapCell(stateOf(["5........"]), at(0, 3));
    expect(next.selected).toBeNull();
  });

  it("clears the selection when the same cell is tapped again", () => {
    const next = tapCell(stateOf(["5........"], { selected: at(0, 0) }), at(0, 0));
    expect(next.selected).toBeNull();
  });

  it("clears a matched pair and scores it", () => {
    const start = stateOf(["5...5...."], { selected: at(0, 0) });
    const next = tapCell(start, at(0, 4));
    expect(next.grid[0]).toEqual([null, null, null, null, null, null, null, null, null]);
    expect(next.selected).toBeNull();
    expect(next.score).toBe(MATCH_POINTS);
  });

  it("does not change the state it was given", () => {
    const start = stateOf(["5...5...."], { selected: at(0, 0) });
    tapCell(start, at(0, 4));
    expect(start.grid[0]![0]).toBe(5);
    expect(start.score).toBe(0);
  });

  it("moves the selection when the second tap does not match", () => {
    const next = tapCell(stateOf(["5...2...."], { selected: at(0, 0) }), at(0, 4));
    expect(next.selected).toEqual(at(0, 4));
    expect(next.grid[0]![0]).toBe(5);
    expect(next.score).toBe(0);
  });

  it("moves the selection when the second tap is not adjacent", () => {
    const next = tapCell(stateOf(["5.3.5...."], { selected: at(0, 0) }), at(0, 4));
    expect(next.selected).toEqual(at(0, 4));
    expect(next.grid[0]![4]).toBe(5);
  });

  it("matches across a row end", () => {
    const start = stateOf(["........6", "4........"], { selected: at(0, 8) });
    const next = tapCell(start, at(1, 0));
    expect(next.grid[0]![8]).toBeNull();
    expect(next.grid[1]![0]).toBeNull();
    expect(next.score).toBe(MATCH_POINTS);
  });

  it("matches vertically across cleared cells", () => {
    const start = stateOf(["7........", ".........", "3........"], { selected: at(0, 0) });
    expect(tapCell(start, at(2, 0)).score).toBe(MATCH_POINTS);
  });

  it("matches diagonally", () => {
    const start = stateOf(["2........", ".2.......", "........."], { selected: at(0, 0) });
    expect(tapCell(start, at(1, 1)).score).toBe(MATCH_POINTS);
  });

  it("moves the selection instead of matching when a filled cell blocks the pair", () => {
    const start = stateOf(["525......"], { selected: at(0, 0) });
    const next = tapCell(start, at(0, 2));
    expect(next.score).toBe(0);
    expect(next.selected).toEqual(at(0, 2));
  });
});

describe("addNumbers", () => {
  it("appends the next reserved row and removes it from the reserve", () => {
    const reserve = [ROW("123456789"), ROW("987654321")];
    const next = addNumbers(startGame(parseGrid(["........."]), reserve));
    expect(next.grid).toHaveLength(2);
    expect(next.grid[1]).toEqual(ROW("123456789"));
    expect(next.reserve).toEqual([ROW("987654321")]);
  });

  it("reports the allowance as the reserve left", () => {
    const state = startGame(parseGrid(["........."]), [ROW("123456789"), ROW("123456789")]);
    expect(addsLeft(state)).toBe(2);
    expect(addsLeft(addNumbers(state))).toBe(1);
  });

  it("does nothing once the reserve is used up", () => {
    const empty = stateOf(["........."]);
    expect(addNumbers(empty)).toBe(empty);
  });
});

describe("isGameOver", () => {
  it("is false while a pair is still playable", () => {
    expect(isGameOver(stateOf(["5.5......"]))).toBe(false);
  });

  it("is false while reserve rows can still be added", () => {
    expect(isGameOver(stateOf(["1.2......"], { reserve: [ROW("123456789")] }))).toBe(false);
  });

  it("is true when no pair is playable and no reserve is left", () => {
    expect(isGameOver(stateOf(["1.2......"]))).toBe(true);
  });

  it("is true when the board is empty and no reserve is left", () => {
    expect(hasValidPair(parseGrid([".........", "........."]))).toBe(false);
  });
});

describe("collapseEmptyRows", () => {
  it("removes rows where every cell is cleared", () => {
    const state = stateOf([".........", "12345678.", "........."]);
    const next = collapseEmptyRows(state);
    expect(next.grid).toHaveLength(1);
    expect(next.grid[0]![0]).toBe(1);
  });

  it("returns the same state when no row is empty", () => {
    const state = stateOf(["12345678.", "........9"]);
    expect(collapseEmptyRows(state)).toBe(state);
  });

  it("keeps the selection on its cell after rows above it are removed", () => {
    const state = stateOf([".........", "1........", "........."], { selected: at(1, 0) });
    const next = collapseEmptyRows(state);
    expect(next.selected).toEqual(at(0, 0));
    expect(next.grid[0]![0]).toBe(1);
  });
});

describe("startGame", () => {
  it("starts with the given grid and reserve, nothing selected, score zero", () => {
    const game = startGame(parseGrid(["12345678."]), [ROW("123456789")]);
    expect(game.grid).toHaveLength(1);
    expect(game.selected).toBeNull();
    expect(game.score).toBe(0);
    expect(addsLeft(game)).toBe(1);
  });
});

describe("undo", () => {
  it("reverses the last match and restores both cleared cells", () => {
    const matched = tapCell(stateOf(["5...5...."], { selected: at(0, 0) }), at(0, 4));
    const undone = undo(matched);
    expect(undone.grid[0]).toEqual([5, null, null, null, 5, null, null, null, null]);
    expect(undone.score).toBe(0);
    expect(undone.history).toHaveLength(0);
  });

  it("restores a row that was collapsed after the match", () => {
    const matched = tapCell(stateOf(["5.5......", "1........"], { selected: at(0, 0) }), at(0, 2));
    const collapsed = collapseEmptyRows(matched);
    expect(collapsed.grid).toHaveLength(1);
    const undone = undo(collapsed);
    expect(undone.grid).toHaveLength(2);
    expect(undone.grid[0]![0]).toBe(5);
  });

  it("reverses an added row and gives its reserve row back", () => {
    const reserve = [[1, 2, 3, 4, 5, 6, 7, 8, 9]];
    const added = addNumbers(startGame(parseGrid(["........."]), reserve));
    const undone = undo(added);
    expect(undone.grid).toHaveLength(1);
    expect(undone.reserve).toEqual(reserve);
  });

  it("steps back through several actions in order", () => {
    let state = tapCell(stateOf(["5.5.1.1.."], { selected: at(0, 0) }), at(0, 2));
    state = tapCell(state, at(0, 4));
    state = tapCell(state, at(0, 6));
    expect(state.score).toBe(2 * MATCH_POINTS);
    expect(state.history).toHaveLength(2);

    const once = undo(state);
    expect(once.score).toBe(MATCH_POINTS);
    expect(once.history).toHaveLength(1);

    const twice = undo(once);
    expect(twice.score).toBe(0);
    expect(twice.history).toHaveLength(0);
  });

  it("does nothing when there is nothing to undo", () => {
    const state = stateOf(["5........"]);
    expect(undo(state)).toBe(state);
  });

  it("keeps at most UNDO_LIMIT steps", () => {
    const reserve = Array.from({ length: UNDO_LIMIT + 5 }, () => [1, 1, 1, 1, 1, 1, 1, 1, 1]);
    let state = startGame(parseGrid(["........."]), reserve);
    while (state.reserve.length > 0) state = addNumbers(state);
    expect(state.history).toHaveLength(UNDO_LIMIT);
  });
});

describe("hints", () => {
  it("highlights a legal pair when requested", () => {
    const state = requestHint(stateOf(["1.9......"]));
    expect(state.hint).toEqual([at(0, 0), at(0, 2)]);
    expect(state.hintSpent).toBe(true);
  });

  it("does nothing when no legal pair exists", () => {
    const state = stateOf(["12......."]);
    expect(requestHint(state)).toBe(state);
  });

  it("is spent once shown and cannot be requested again this stage", () => {
    const shown = requestHint(stateOf(["11......."]));
    expect(requestHint(dismissHint(shown)).hintSpent).toBe(true);
    expect(requestHint(shown)).toBe(shown);
  });

  it("gives the hint back when dismissed without using it", () => {
    const shown = requestHint(stateOf(["11......."]));
    const dismissed = dismissHint(shown);
    expect(dismissed.hint).toBeNull();
    expect(dismissed.hintSpent).toBe(false);
    expect(requestHint(dismissed).hint).not.toBeNull();
  });

  it("clears the highlight when the hinted pair is matched", () => {
    const shown = requestHint(stateOf(["11......."], { selected: at(0, 0) }));
    const matched = tapCell({ ...shown, selected: at(0, 0) }, at(0, 1));
    expect(matched.hint).toBeNull();
    expect(matched.hintSpent).toBe(true);
  });

  it("is available again after a new row is added", () => {
    const spent = requestHint(stateOf(["11......."], { reserve: [[1, 2, 3, 4, 5, 6, 7, 8, 9]] }));
    const next = addNumbers(dismissHint({ ...spent, hintSpent: true }));
    expect(next.hintSpent).toBe(false);
  });
});

describe("isWon", () => {
  it("is true once every cell is cleared", () => {
    expect(isWon(stateOf([".........", "........."]))).toBe(true);
  });

  it("is false while any cell is filled", () => {
    expect(isWon(stateOf(["........1"]))).toBe(false);
  });
});
