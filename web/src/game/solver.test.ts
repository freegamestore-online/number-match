import { describe, expect, it } from "vitest";
import { dailyDeal, dealSeed, generateDeal, SHIPPED_DEALS, shippedDeal } from "./deal";
import { addNumbers, collapseEmptyRows, isEmptyRow, startGame, tapCell, type GameState } from "./match";
import { solve } from "./solver";
import { parseGrid } from "../test/grid";

// CI gate: every shipped deal must be clearable within the add allowance. The
// solver is the source of truth, so a change to the generator or the rules fails here.
describe("solver gate: shipped deals", () => {
  for (const { number } of SHIPPED_DEALS) {
    it(`deal ${number} is clearable`, () => {
      const deal = shippedDeal(number)!;
      const result = solve(deal.grid, deal.reserve);
      expect(result.status).toBe("solved");
    }, 120_000);
  }

  it("the daily deal is clearable", () => {
    const deal = dailyDeal();
    expect(solve(deal.grid, deal.reserve).status).toBe("solved");
  }, 120_000);
});

describe("solve", () => {
  it("returns a move list that replays through the engine to a cleared board", () => {
    const deal = generateDeal(dealSeed(1, 0));
    const result = solve(deal.grid, deal.reserve);
    if (result.status !== "solved") throw new Error("expected a solution");

    let state: GameState = startGame(deal.grid, deal.reserve);
    for (const move of result.moves) {
      if (move.kind === "add") {
        state = addNumbers(state);
      } else {
        state = collapseEmptyRows(tapCell({ ...state, selected: move.a }, move.b));
      }
    }
    expect(state.grid.every(isEmptyRow)).toBe(true);
  });

  it("reports unsolved when a leftover digit has no partner", () => {
    const grid = parseGrid(["1........"]);
    expect(solve(grid, []).status).toBe("unsolved");
  });

  it("uses the reserve when the grid alone cannot clear", () => {
    // The lone 4 cannot pair on its own. Adding the reserved row puts a 6 directly
    // below it (4 + 6 = 10), and the remaining 6s pair off.
    const grid = parseGrid(["4........"]);
    const result = solve(grid, [[6, 6, 6, 6, 6, 6, 6, 6, 6]]);
    if (result.status !== "solved") throw new Error(`expected solved, got ${result.status}`);
    expect(result.moves[0]).toEqual({ kind: "add" });
  });

  it("stops with budget-exceeded once the state limit is reached", () => {
    const deal = generateDeal(dealSeed(1, 0));
    const result = solve(deal.grid, deal.reserve, 1);
    expect(result.status).toBe("budget-exceeded");
  });
});
