import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearProgress, loadProgress, progressKey, saveProgress } from "./progress";
import { addNumbers, startGame, tapCell, type GameState } from "./match";
import { parseGrid } from "../test/grid";

const KEY = "number-match:progress:deal:1";
const fallback = { grid: parseGrid(["5.5......"]), reserve: [[1, 2, 3, 4, 5, 6, 7, 8, 9]] };

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("progressKey", () => {
  it("keys a daily deal by its date", () => {
    expect(progressKey({ number: 3 }, "2026-10-05")).toBe("number-match:progress:daily:2026-10-05");
  });

  it("keys a practice deal by its number", () => {
    expect(progressKey({ number: 3 }, null)).toBe("number-match:progress:deal:3");
  });
});

describe("saveProgress and loadProgress", () => {
  it("resumes the same board, score, reserve and undo stack after a reload", () => {
    let state = startGame(fallback.grid, fallback.reserve);
    state = tapCell({ ...state, selected: { row: 0, col: 0 } }, { row: 0, col: 2 });
    state = addNumbers(state);
    saveProgress(KEY, state);

    const resumed = loadProgress(KEY, fallback);
    expect(resumed.grid).toEqual(state.grid);
    expect(resumed.score).toBe(state.score);
    expect(resumed.reserve).toEqual(state.reserve);
    expect(resumed.history).toEqual(state.history);
    expect(resumed.hintSpent).toBe(state.hintSpent);
  });

  it("does not restore a selection or a hint", () => {
    const state: GameState = { ...startGame(fallback.grid, fallback.reserve), selected: { row: 0, col: 0 }, hint: [{ row: 0, col: 0 }, { row: 0, col: 2 }] };
    saveProgress(KEY, state);
    const resumed = loadProgress(KEY, fallback);
    expect(resumed.selected).toBeNull();
    expect(resumed.hint).toBeNull();
  });

  it("starts the deal fresh when nothing is saved", () => {
    const state = loadProgress(KEY, fallback);
    expect(state.grid).toEqual(fallback.grid);
    expect(state.score).toBe(0);
  });

  it("ignores malformed saved data", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadProgress(KEY, fallback).grid).toEqual(fallback.grid);
  });

  it("ignores saved data with a bad cell value", () => {
    localStorage.setItem(KEY, JSON.stringify({ ...startGame(fallback.grid, fallback.reserve), grid: [[10, null, null, null, null, null, null, null, null]] }));
    expect(loadProgress(KEY, fallback).grid).toEqual(fallback.grid);
  });

  it("ignores saved data from an older shape with no undo stack", () => {
    localStorage.setItem(KEY, JSON.stringify({ grid: fallback.grid, reserve: fallback.reserve, score: 0 }));
    expect(loadProgress(KEY, fallback).grid).toEqual(fallback.grid);
  });

  it("keeps working when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveProgress(KEY, startGame(fallback.grid, fallback.reserve))).not.toThrow();
    expect(loadProgress(KEY, fallback).grid).toEqual(fallback.grid);
  });
});

describe("clearProgress", () => {
  it("removes the saved state so the next load starts fresh", () => {
    saveProgress(KEY, { ...startGame(fallback.grid, fallback.reserve), score: 40 });
    clearProgress(KEY);
    expect(loadProgress(KEY, fallback).score).toBe(0);
  });
});
