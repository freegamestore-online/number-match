import { useEffect, useState } from "react";
import { GameShell, GameTopbar, GameAuth } from "@freegamestore/games";
import { Board, type MatchEvent } from "./components/Board";
import { HAPTICS, useHaptics } from "./feel";
import { useHighScore } from "./hooks/useHighScore";
import { dailyDeal, localDateKey, msUntilLocalMidnight, SHIPPED_DEALS, shippedDeal, type Deal } from "./game/deal";
import { submitDailyScore } from "./game/leaderboard";
import {
  addNumbers,
  addsLeft,
  collapseEmptyRows,
  isEmptyRow,
  isGameOver,
  startGame,
  tapCell,
  type GameState,
} from "./game/match";
import { ADD_ALLOWANCE, type Pos } from "./game/grid";

/** How long a cleared row stays visible, shrinking, before the grid collapses. Matches the CSS animation. */
const COLLAPSE_MS = 240;

/** Which deal is on screen: today's daily deal, or a numbered practice deal. */
type DealChoice = "daily" | number;

export default function App() {
  const [choice, setChoice] = useState<DealChoice>("daily");
  const [round, setRound] = useState(0);
  const [, setDay] = useState(0);
  const dateKey = localDateKey();

  // Rotate the daily deal at local midnight, even if the page stays open.
  useEffect(() => {
    const id = setTimeout(() => setDay((d) => d + 1), msUntilLocalMidnight());
    return () => clearTimeout(id);
  }, [dateKey]);

  const deal = (choice === "daily" ? dailyDeal() : shippedDeal(choice)) ?? dailyDeal();
  const isDaily = choice === "daily";

  const numbers = SHIPPED_DEALS.map((d) => d.number);
  const next = () => {
    const index = numbers.indexOf(deal.number);
    setChoice(numbers[(index + 1) % numbers.length]!);
    setRound((r) => r + 1);
  };

  return (
    <GameShell topbar={<GameTopbar title="Number Match" score={0} />}>
      <GameAuth />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <button type="button" onClick={() => setChoice("daily")} disabled={isDaily} className="font-semibold disabled:opacity-40">
            Daily deal ({dateKey})
          </button>
          <button type="button" onClick={next} className="font-semibold">
            Deal #{deal.number} · next
          </button>
        </div>
        <PlayDeal key={`${choice}-${dateKey}-${round}`} deal={deal} dateKey={isDaily ? dateKey : null} onRestart={() => setRound((r) => r + 1)} />
      </main>
    </GameShell>
  );
}

interface PlayDealProps {
  deal: Deal;
  /** Set for the daily deal: its best score is kept and submitted. Null for practice deals. */
  dateKey: string | null;
  onRestart: () => void;
}

function PlayDeal({ deal, dateKey, onRestart }: PlayDealProps) {
  const [game, setGame] = useState<GameState>(() => startGame(deal.grid, deal.reserve));
  const [match, setMatch] = useState<MatchEvent | null>(null);
  const haptics = useHaptics();
  const [dailyBest, updateDailyBest] = useHighScore(`number-match:daily-best:${dateKey ?? "practice"}`);
  const over = isGameOver(game);

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

  // Game over runs once: record the daily best and submit it. Submission is quiet,
  // so an "Invalid game" or signed-out response changes nothing on screen.
  useEffect(() => {
    if (!over || !dateKey) return;
    updateDailyBest(game.score);
    if (game.score > 0) void submitDailyScore(dateKey, game.score);
    // updateDailyBest changes identity each render; the game-over event is what matters.
  }, [over, dateKey, game.score]);

  return (
    <>
      <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
        Score {game.score}
        {dateKey && ` · Best ${Math.max(dailyBest, game.score)}`}
      </p>
      <Board grid={game.grid} selected={game.selected} match={match} onTap={handleTap} />
      {over ? (
        <div className="flex flex-col items-center gap-3">
          <p className="font-semibold">No moves left. Final score {game.score}.</p>
          <button type="button" onClick={onRestart} className="rounded-full px-5 py-2 font-semibold" style={{ background: "var(--accent)", color: "#ffffff" }}>
            Play again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setGame((current) => addNumbers(current))}
          disabled={addsLeft(game) <= 0}
          className="self-center rounded-full px-5 py-2 font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#ffffff" }}
        >
          Add numbers ({addsLeft(game)}/{ADD_ALLOWANCE})
        </button>
      )}
    </>
  );
}
