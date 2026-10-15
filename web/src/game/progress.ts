import { COLS, type Cell, type Grid } from "./grid";
import { startGame, type GameState, type Snapshot } from "./match";

// Progress is saved per deal, so a page refresh resumes the same board, undo
// stack and add-numbers count. Storage can be missing or full (private mode,
// quota), so every access is guarded and the game still plays without it.

const PREFIX = "number-match:progress:";

/** The storage key for a deal: the daily deal by its date, a numbered deal by its number. */
export function progressKey(deal: { number: number }, dateKey: string | null): string {
  return dateKey ? `${PREFIX}daily:${dateKey}` : `${PREFIX}deal:${deal.number}`;
}

/** Save the state to storage. Does nothing when storage is unavailable. */
export function saveProgress(key: string, state: GameState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Quota or private mode: play on without saving.
  }
}

/** Remove a deal's saved progress. */
export function clearProgress(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/**
 * Load saved progress for a deal. Returns null when nothing is saved, the data is
 * malformed, or it was saved by an older version. A bad save is ignored, not thrown.
 */
export function loadProgress(key: string, fallback: { grid: Grid; reserve: Cell[][] }): GameState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSavedState(parsed)) return { ...parsed, selected: null, hint: null };
    }
  } catch {
    // Unreadable or malformed: start the deal fresh.
  }
  return startGame(fallback.grid, fallback.reserve);
}

function isCell(value: unknown): value is Cell {
  return value === null || (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 9);
}

function isRows(value: unknown): value is Cell[][] {
  return Array.isArray(value) && value.every((row) => Array.isArray(row) && row.length === COLS && row.every(isCell));
}

function isSnapshot(value: unknown): value is Snapshot {
  const snap = value as Snapshot;
  return (
    typeof snap === "object" &&
    snap !== null &&
    isRows(snap.grid) &&
    isRows(snap.reserve) &&
    Number.isInteger(snap.score) &&
    snap.score >= 0
  );
}

function isSavedState(value: unknown): value is GameState {
  const state = value as GameState;
  return (
    typeof state === "object" &&
    state !== null &&
    isRows(state.grid) &&
    isRows(state.reserve) &&
    Number.isInteger(state.score) &&
    state.score >= 0 &&
    Array.isArray(state.history) &&
    state.history.every(isSnapshot) &&
    typeof state.hintSpent === "boolean"
  );
}
