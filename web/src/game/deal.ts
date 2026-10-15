import { ADD_ALLOWANCE, COLS, INITIAL_ROWS, type Cell, type Grid } from "./grid";
import { createRng, hashSeed } from "./rng";

/** A deal: the starting grid, and the rows "Add numbers" will release, in order. */
export interface Deal {
  /** Deal number, shown to the player. Daily deals use the number of the shipped deal they draw. */
  number: number;
  grid: Grid;
  reserve: Cell[][];
}

/**
 * Shipped deals. Each entry is the attempt index whose seed produced a deal the
 * solver confirmed is clearable within the add allowance. CI re-checks every
 * entry (`solver.test.ts`), so a change to the generator fails the build.
 */
export const SHIPPED_DEALS: ReadonlyArray<{ number: number; attempt: number }> = [
  { number: 1, attempt: 0 },
  { number: 2, attempt: 0 },
  { number: 3, attempt: 0 },
  { number: 4, attempt: 0 },
  { number: 5, attempt: 0 },
  { number: 6, attempt: 1 },
  { number: 7, attempt: 0 },
  { number: 8, attempt: 0 },
  { number: 9, attempt: 0 },
  { number: 10, attempt: 0 },
  { number: 11, attempt: 0 },
  { number: 12, attempt: 0 },
];

/** Seed for one attempt at deal `number`. The same seed always gives the same deal. */
export function dealSeed(number: number, attempt: number): string {
  return `number-match:deal:${number}:${attempt}`;
}

/**
 * Build a deal from a seed: INITIAL_ROWS filled rows, then ADD_ALLOWANCE reserved rows.
 *
 * Digits are dealt as matching pairs (equal values, or values summing to ten),
 * then shuffled over the cells. A board can only clear when each pair class
 * (1 and 9, 2 and 8, 3 and 7, 4 and 6, 5) holds an even count, so dealing pairs
 * avoids the dead boards that random digits produce.
 */
export function generateDeal(seed: string): { grid: Grid; reserve: Cell[][] } {
  const rng = createRng(seed);
  const cells = (INITIAL_ROWS + ADD_ALLOWANCE) * COLS;
  const values: number[] = [];
  while (values.length < cells) {
    const a = rng.int(9) + 1;
    const b = rng.next() < 0.5 ? a : 10 - a;
    values.push(a, b);
  }
  for (let i = values.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  const rows: Cell[][] = [];
  for (let r = 0; r < INITIAL_ROWS + ADD_ALLOWANCE; r++) {
    rows.push(values.slice(r * COLS, (r + 1) * COLS));
  }
  return { grid: rows.slice(0, INITIAL_ROWS), reserve: rows.slice(INITIAL_ROWS) };
}

/** The shipped deal with this number, or undefined if it is not shipped. */
export function shippedDeal(number: number): Deal | undefined {
  const entry = SHIPPED_DEALS.find((deal) => deal.number === number);
  if (!entry) return undefined;
  return { number, ...generateDeal(dealSeed(entry.number, entry.attempt)) };
}

/** Local calendar date as YYYY-MM-DD. The daily deal rotates at local midnight. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Number of the shipped deal for a local date. Stable for the whole day. */
export function dailyDealNumber(dateKey: string): number {
  if (SHIPPED_DEALS.length === 0) throw new RangeError("no shipped deals");
  const index = hashSeed(`number-match:daily:${dateKey}`) % SHIPPED_DEALS.length;
  return SHIPPED_DEALS[index]!.number;
}

/** Today's daily deal, drawn from the shipped deals. */
export function dailyDeal(date: Date = new Date()): Deal {
  const deal = shippedDeal(dailyDealNumber(localDateKey(date)));
  if (!deal) throw new RangeError("daily deal is not shipped");
  return deal;
}

/** Milliseconds from `date` until the next local midnight, when the daily deal rotates. */
export function msUntilLocalMidnight(date: Date = new Date()): number {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return next.getTime() - date.getTime();
}
