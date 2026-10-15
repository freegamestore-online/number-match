import { describe, expect, it } from "vitest";
import { nearestCell, type CellCentre } from "./tapTarget";

// Two cells 34px apart (30px cell, 4px gap).
const cells: CellCentre[] = [
  { row: 0, col: 0, x: 15, y: 15 },
  { row: 0, col: 1, x: 49, y: 15 },
];

describe("nearestCell", () => {
  it("picks the cell under the tap", () => {
    expect(nearestCell(cells, 15, 15)).toEqual({ row: 0, col: 0 });
  });

  it("picks the nearer cell for a tap in the gap", () => {
    expect(nearestCell(cells, 25, 15)).toEqual({ row: 0, col: 0 });
    expect(nearestCell(cells, 40, 15)).toEqual({ row: 0, col: 1 });
  });

  it("ignores a tap farther than the radius from every cell", () => {
    expect(nearestCell(cells, 15, 100)).toBeNull();
  });

  it("returns null when there are no cells", () => {
    expect(nearestCell([], 0, 0)).toBeNull();
  });
});
