import { describe, expect, it } from "vitest";
import { isAdjacent } from "./adjacency";
import { parseGrid } from "../test/grid";

const at = (row: number, col: number) => ({ row, col });

describe("isAdjacent", () => {
  it("never treats a cell as adjacent to itself", () => {
    const grid = parseGrid(["123456789"]);
    expect(isAdjacent(grid, at(0, 4), at(0, 4))).toBe(false);
  });

  it("rejects pairs that are not on a line", () => {
    // Knight's move: row +2, column +1.
    const grid = parseGrid(["12345678.", ".........", "........."]);
    expect(isAdjacent(grid, at(0, 0), at(2, 1))).toBe(false);
  });

  it("rejects positions outside the grid", () => {
    const grid = parseGrid(["123456789"]);
    expect(isAdjacent(grid, at(0, 0), at(3, 0))).toBe(false);
  });

  describe("horizontal", () => {
    it("is adjacent when the next cell is directly beside it", () => {
      const grid = parseGrid(["123456789"]);
      expect(isAdjacent(grid, at(0, 3), at(0, 4))).toBe(true);
    });

    it("is adjacent across cleared cells", () => {
      const grid = parseGrid(["1...5...9"]);
      expect(isAdjacent(grid, at(0, 0), at(0, 4))).toBe(true);
    });

    it("is blocked by a filled cell between", () => {
      const grid = parseGrid(["1.3.5...9"]);
      expect(isAdjacent(grid, at(0, 0), at(0, 4))).toBe(false);
    });

    it("is the same whichever cell is tapped first", () => {
      const grid = parseGrid(["1...5...9"]);
      expect(isAdjacent(grid, at(0, 4), at(0, 0))).toBe(true);
    });
  });

  describe("vertical", () => {
    it("is adjacent when the cell below is directly under it", () => {
      const grid = parseGrid(["1........", "2........"]);
      expect(isAdjacent(grid, at(0, 0), at(1, 0))).toBe(true);
    });

    it("is adjacent across cleared cells in the column", () => {
      const grid = parseGrid(["1........", ".........", ".........", "9........"]);
      expect(isAdjacent(grid, at(0, 0), at(3, 0))).toBe(true);
    });

    it("is blocked by a filled cell in the column", () => {
      const grid = parseGrid(["1........", "5........", ".........", "9........"]);
      expect(isAdjacent(grid, at(0, 0), at(3, 0))).toBe(false);
    });

    it("ignores filled cells in other columns", () => {
      const grid = parseGrid(["1........", ".5.......", ".........", "9........"]);
      expect(isAdjacent(grid, at(0, 0), at(3, 0))).toBe(true);
    });
  });

  describe("diagonal", () => {
    it("is adjacent down and to the right", () => {
      const grid = parseGrid(["1........", ".2.......", "........."]);
      expect(isAdjacent(grid, at(0, 0), at(1, 1))).toBe(true);
    });

    it("is adjacent up and to the left", () => {
      const grid = parseGrid(["1........", ".2.......", ".........", "........."]);
      expect(isAdjacent(grid, at(1, 1), at(0, 0))).toBe(true);
    });

    it("is adjacent down and to the left across cleared cells", () => {
      const grid = parseGrid(["....5....", ".........", "3........", "........."]);
      expect(isAdjacent(grid, at(0, 4), at(2, 2))).toBe(true);
    });

    it("is adjacent up and to the right across cleared cells", () => {
      const grid = parseGrid(["........9", ".........", "........."]);
      expect(isAdjacent(grid, at(2, 0), at(0, 2))).toBe(true);
    });

    it("is blocked by a filled cell on the diagonal", () => {
      const grid = parseGrid(["1........", ".7.......", "...3....."]);
      expect(isAdjacent(grid, at(0, 0), at(2, 2))).toBe(false);
    });
  });

  describe("reading order across row ends", () => {
    it("is adjacent from the last cell of a row to the first of the next", () => {
      const grid = parseGrid(["........4", "1........"]);
      expect(isAdjacent(grid, at(0, 8), at(1, 0))).toBe(true);
    });

    it("is adjacent when the rest of the row and the start of the next are cleared", () => {
      const grid = parseGrid(["5......4.", "..1......"]);
      expect(isAdjacent(grid, at(0, 7), at(1, 2))).toBe(true);
    });

    it("is blocked by a filled cell between the first tap and the row end", () => {
      const grid = parseGrid(["....5.7.9", "1........"]);
      expect(isAdjacent(grid, at(0, 4), at(1, 0))).toBe(false);
    });

    it("is blocked by a filled cell before the second tap in its row", () => {
      const grid = parseGrid(["........4", "7.1......"]);
      expect(isAdjacent(grid, at(0, 8), at(1, 2))).toBe(false);
    });

    it("is adjacent from a row end to a later row when the rows between are cleared", () => {
      const grid = parseGrid(["........4", ".........", "1........"]);
      expect(isAdjacent(grid, at(0, 8), at(2, 0))).toBe(true);
    });

    it("is blocked when a row between has a filled cell", () => {
      const grid = parseGrid(["........4", "....8....", "1........"]);
      expect(isAdjacent(grid, at(0, 8), at(2, 0))).toBe(false);
    });
  });
});
