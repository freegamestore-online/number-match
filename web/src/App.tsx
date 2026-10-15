import { useEffect, useState } from "react";
import { GameShell, GameTopbar, GameAuth } from "@freegamestore/games";
import { Board, type MatchEvent } from "./components/Board";
import { HAPTICS, useHaptics } from "./feel";
import { addNumbers, collapseEmptyRows, createGame, isEmptyRow, tapCell, type GameState } from "./game/match";
import { ADD_ALLOWANCE, type Pos } from "./game/grid";

/** How long a cleared row stays visible, shrinking, before the grid collapses. Matches the CSS animation. */
const COLLAPSE_MS = 240;

export default function App() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [match, setMatch] = useState<MatchEvent | null>(null);
  const haptics = useHaptics();

  // Each tap runs through the engine. A match is detected by the score rising,
  // which drives the burst, the pop-up and the clear pulse. The score only rises,
  // so it doubles as a unique match id.
  function handleTap(pos: Pos) {
    const next = tapCell(game, pos);
    if (next.score > game.score && game.selected) {
      setMatch({ id: next.score, a: game.selected, b: pos, points: next.score - game.score });
      haptics.pulse(HAPTICS.clear);
    }
    setGame(next);
  }

  // Collapse after the row animation. Only empty rows wait; the timer clears
  // when the grid changes, so a second match cannot collapse early.
  const hasEmpty = game.grid.some(isEmptyRow);
  useEffect(() => {
    if (!hasEmpty) return;
    const id = setTimeout(() => setGame((current) => collapseEmptyRows(current)), COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [hasEmpty, game.grid]);

  return (
    <GameShell topbar={<GameTopbar title="Number Match" score={game.score} />}>
      <GameAuth />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <Board grid={game.grid} selected={game.selected} match={match} onTap={handleTap} />
        <button
          type="button"
          onClick={() => setGame((current) => addNumbers(current))}
          disabled={game.addsLeft <= 0}
          className="self-center rounded-full px-5 py-2 font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#ffffff" }}
        >
          Add numbers ({game.addsLeft}/{ADD_ALLOWANCE})
        </button>
      </main>
    </GameShell>
  );
}
