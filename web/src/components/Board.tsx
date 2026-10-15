import { useEffect, useRef, useState } from "react";
import { ParticleLayer, type ParticleLayerHandle } from "../feel/ParticleLayer";
import { ScorePop } from "../feel/ScorePop";
import { type Grid, type Pos } from "../game/grid";
import { isEmptyRow } from "../game/match";
import { nearestCell, type CellCentre } from "./tapTarget";

/** A match just cleared two cells. The id changes on every match so the effect runs again. */
export interface MatchEvent {
  id: number;
  a: Pos;
  b: Pos;
  points: number;
}

export interface BoardProps {
  grid: Grid;
  selected: Pos | null;
  match: MatchEvent | null;
  /** The pair being highlighted as a hint, if any. */
  hint: [Pos, Pos] | null;
  /** True once the board is fully cleared. Fires the win burst once. */
  won: boolean;
  onTap: (pos: Pos) => void;
}

/** Colours for a match burst. They follow the accent and the number palette. */
const BURST_COLOURS = ["#2563eb", "#16a34a", "#d97706", "#dc2626"];

interface Pop {
  id: number;
  points: number;
  x: number;
  y: number;
}

/**
 * The digit grid. Each row is its own element so a cleared row can collapse
 * with an animation. A match fires a particle burst from each cleared cell and
 * a `+N` pop-up between them.
 */
export function Board({ grid, selected, match, hint, won, onTap }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<ParticleLayerHandle>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  // A board that is already won when it mounts (a reload) does not celebrate again.
  const wonOnMount = useRef(won);

  useEffect(() => {
    const board = boardRef.current;
    if (!won || wonOnMount.current || !board) return;
    const x = board.offsetWidth / 2;
    const y = board.offsetHeight / 2;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        particlesRef.current?.burst(x, y, BURST_COLOURS, { count: 40, speed: [160, 380], size: [4, 9], life: 1.2 });
      }, i * 180);
    }
  }, [won]);

  // One tap handler for the board. A pointer tap resolves to the nearest filled
  // cell, so taps in the gaps between cells still land. A keyboard activation
  // (detail 0) uses the focused cell directly.
  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const board = boardRef.current;
    if (!board) return;
    if (event.detail === 0) {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-pos]");
      const [row, col] = (target?.dataset.pos ?? "").split("-").map(Number);
      if (row !== undefined && col !== undefined && !Number.isNaN(row) && !Number.isNaN(col)) onTap({ row, col });
      return;
    }
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centres: CellCentre[] = [];
    board.querySelectorAll<HTMLElement>("[data-pos]:not(:disabled)").forEach((cell) => {
      const [row, col] = cell.dataset.pos!.split("-").map(Number) as [number, number];
      const cellRect = cell.getBoundingClientRect();
      centres.push({ row, col, x: cellRect.left - rect.left + cellRect.width / 2, y: cellRect.top - rect.top + cellRect.height / 2 });
    });
    const pos = nearestCell(centres, x, y);
    if (pos) onTap(pos);
  }

  useEffect(() => {
    const board = boardRef.current;
    if (!match || !board) return;
    const centre = (pos: Pos) => {
      const cell = board.querySelector<HTMLElement>(`[data-pos="${pos.row}-${pos.col}"]`);
      if (!cell) return null;
      return { x: cell.offsetLeft + cell.offsetWidth / 2, y: cell.offsetTop + cell.offsetHeight / 2 };
    };
    const a = centre(match.a);
    const b = centre(match.b);
    if (!a || !b) return;
    for (const point of [a, b]) {
      particlesRef.current?.burst(point.x, point.y, BURST_COLOURS, { count: 18, speed: [120, 260], size: [4, 8], life: 0.6 });
    }
    setPops((current) => [...current, { id: match.id, points: match.points, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }]);
  }, [match]);

  return (
    <div ref={boardRef} className="board relative flex flex-col items-center gap-1" onClick={handleClick}>
      {grid.map((row, r) => (
        <div
          key={r}
          className={`board-row ${isEmptyRow(row) ? "row-clearing" : ""}`}
        >
          {row.map((cell, c) => {
            const isSelected = selected?.row === r && selected?.col === c;
            const isHinted = hint?.some((p) => p.row === r && p.col === c) ?? false;
            return (
              <button
                key={c}
                type="button"
                data-pos={`${r}-${c}`}
                data-selected={isSelected || undefined}
                data-hint={isHinted || undefined}
                disabled={cell === null}
                aria-label={cell === null ? `Cleared, row ${r + 1}, column ${c + 1}` : `${cell}, row ${r + 1}, column ${c + 1}`}
                className={`board-cell rounded-lg font-bold ${cell === null ? "pointer-events-none" : ""}`}
                style={{
                  background: cell === null ? "transparent" : isSelected ? "var(--accent)" : isHinted ? "var(--accent-soft)" : "var(--panel)",
                  color: isSelected ? "#ffffff" : "var(--ink)",
                  border: cell === null ? "1px dashed var(--line)" : isHinted ? "2px solid var(--accent)" : "1px solid var(--line)",
                }}
              >
                {cell ?? ""}
              </button>
            );
          })}
        </div>
      ))}
      <ParticleLayer ref={particlesRef} />
      {pops.map((pop) => (
        <ScorePop
          key={pop.id}
          points={pop.points}
          x={pop.x}
          y={pop.y}
          onDone={() => setPops((current) => current.filter((p) => p.id !== pop.id))}
        />
      ))}
    </div>
  );
}
