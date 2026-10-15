/**
 * Resolve a tap to the nearest filled cell. Cells on a 320px phone are about
 * 30px across, so a tap in the gap between two cells is often closer to one
 * than the other. Picking the nearest centre keeps taps reliable without making
 * the cells overlap. A tap farther than `radius` from every cell is ignored.
 */
export interface CellCentre {
  row: number;
  col: number;
  x: number;
  y: number;
}

export const TAP_RADIUS = 26;

export function nearestCell(
  cells: readonly CellCentre[],
  x: number,
  y: number,
  radius: number = TAP_RADIUS,
): { row: number; col: number } | null {
  let best: CellCentre | null = null;
  let bestDistance = radius;
  for (const cell of cells) {
    const distance = Math.hypot(cell.x - x, cell.y - y);
    if (distance <= bestDistance) {
      best = cell;
      bestDistance = distance;
    }
  }
  return best ? { row: best.row, col: best.col } : null;
}
