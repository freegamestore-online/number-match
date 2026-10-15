import { describe, expect, it } from "vitest";
import { ADD_ALLOWANCE, COLS, INITIAL_ROWS } from "./grid";
import {
  dailyDeal,
  dailyDealNumber,
  msUntilLocalMidnight,
  dealSeed,
  generateDeal,
  localDateKey,
  SHIPPED_DEALS,
  shippedDeal,
} from "./deal";

const PAIR_CLASSES = [[1, 9], [2, 8], [3, 7], [4, 6], [5]];

describe("generateDeal", () => {
  it("reproduces the same deal from the same seed", () => {
    expect(generateDeal("number-match:deal:1:0")).toEqual(generateDeal("number-match:deal:1:0"));
  });

  it("gives different deals from different seeds", () => {
    expect(generateDeal("number-match:deal:1:0")).not.toEqual(generateDeal("number-match:deal:2:0"));
  });

  it("builds the starting rows and the reserve rows, all full", () => {
    const deal = generateDeal("number-match:deal:1:0");
    expect(deal.grid).toHaveLength(INITIAL_ROWS);
    expect(deal.reserve).toHaveLength(ADD_ALLOWANCE);
    for (const row of [...deal.grid, ...deal.reserve]) {
      expect(row).toHaveLength(COLS);
      expect(row.every((cell) => cell !== null && cell >= 1 && cell <= 9)).toBe(true);
    }
  });

  it("gives every pair class an even count, so the board can clear", () => {
    for (let n = 1; n <= 20; n++) {
      const deal = generateDeal(dealSeed(n, 0));
      const digits = [...deal.grid, ...deal.reserve].flat() as number[];
      for (const klass of PAIR_CLASSES) {
        const count = digits.filter((d) => klass.includes(d)).length;
        expect(count % 2).toBe(0);
      }
    }
  });
});

describe("shipped deals", () => {
  it("ships at least one deal", () => {
    expect(SHIPPED_DEALS.length).toBeGreaterThan(0);
  });

  it("looks up a shipped deal by number and returns a full deal", () => {
    const first = SHIPPED_DEALS[0]!;
    const deal = shippedDeal(first.number);
    expect(deal?.number).toBe(first.number);
    expect(deal?.grid).toEqual(generateDeal(dealSeed(first.number, first.attempt)).grid);
  });

  it("returns undefined for an unshipped number", () => {
    expect(shippedDeal(0)).toBeUndefined();
  });
});

describe("localDateKey", () => {
  it("uses the local calendar date as YYYY-MM-DD", () => {
    expect(localDateKey(new Date(2026, 9, 5, 12, 0, 0))).toBe("2026-10-05");
  });

  it("changes at local midnight", () => {
    expect(localDateKey(new Date(2026, 9, 5, 23, 59, 59))).toBe("2026-10-05");
    expect(localDateKey(new Date(2026, 9, 6, 0, 0, 0))).toBe("2026-10-06");
  });
});

describe("dailyDeal", () => {
  it("is the same all day and draws from the shipped deals", () => {
    const morning = dailyDealNumber(localDateKey(new Date(2026, 9, 5, 8)));
    const night = dailyDealNumber(localDateKey(new Date(2026, 9, 5, 22)));
    expect(night).toBe(morning);
    expect(SHIPPED_DEALS.map((d) => d.number)).toContain(morning);
  });

  it("returns the deal for today's local date", () => {
    const date = new Date(2026, 9, 5, 12);
    expect(dailyDeal(date)).toEqual(shippedDeal(dailyDealNumber(localDateKey(date))));
  });

  it("rotates across the shipped deals over a run of days", () => {
    const numbers = new Set<number>();
    for (let day = 1; day <= 60; day++) numbers.add(dailyDealNumber(`2026-10-${String(day).padStart(2, "0")}`));
    expect(numbers.size).toBeGreaterThan(1);
  });
});

describe("msUntilLocalMidnight", () => {
  it("counts down to the next local midnight", () => {
    expect(msUntilLocalMidnight(new Date(2026, 9, 5, 23, 0, 0))).toBe(60 * 60 * 1000);
  });
});
