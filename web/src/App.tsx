import { useEffect, useRef, useState } from "react";
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
  dismissHint,
  isEmptyRow,
  isGameOver,
  isWon,
  requestHint,
  tapCell,
  undo,
  type GameState,
} from "./game/match";
import { clearProgress, loadProgress, progressKey, saveProgress } from "./game/progress";
import { ADD_ALLOWANCE, type Pos } from "./game/grid";

/** How long a cleared row stays visible, shrinking, before the grid collapses. Matches the CSS animation. */
const COLLAPSE_MS = 240;

/** Which deal is on screen: today's daily deal, or a numbered practice deal. */
type DealChoice = "daily" | number;

export default function App() {
  const [choice, setChoice] = useState<DealChoice>("daily");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
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
    <GameShell topbar={<GameTopbar title="Number Match" score={score} actions={<GameAuth />} />}>
      <main className="mx-auto flex h-full w-full max-w-md flex-col gap-2 p-2">
        <div className="flex items-center justify-between gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <button type="button" onClick={() => setChoice("daily")} disabled={isDaily} className="min-h-11 font-semibold disabled:opacity-40">
            Daily deal ({dateKey})
          </button>
          <button type="button" onClick={next} className="min-h-11 font-semibold">
            Deal #{deal.number} · next
          </button>
        </div>
        <PlayDeal
          key={`${choice}-${dateKey}-${round}`}
          deal={deal}
          dateKey={isDaily ? dateKey : null}
          onRestart={() => setRound((r) => r + 1)}
          onNext={next}
          onScore={setScore}
        />
      </main>
    </GameShell>
  );
}

interface PlayDealProps {
  deal: Deal;
  /** Set for the daily deal: its best score is kept and submitted. Null for practice deals. */
  dateKey: string | null;
  onRestart: () => void;
  onNext: () => void;
  /** Reports the live score up to the topbar. */
  onScore: (score: number) => void;
}

function PlayDeal({ deal, dateKey, onRestart, onNext, onScore }: PlayDealProps) {
  const key = progressKey(deal, dateKey);
  const [game, setGame] = useState<GameState>(() => loadProgress(key, deal));
  const [match, setMatch] = useState<MatchEvent | null>(null);
  const haptics = useHaptics();
  const [dailyBest, updateDailyBest] = useHighScore(`number-match:daily-best:${dateKey ?? "practice"}`);
  const over = isGameOver(game);
  const won = isWon(game);

  // Save after every change, so a refresh resumes this board.
  useEffect(() => {
    saveProgress(key, game);
  }, [key, game]);

  useEffect(() => {
    onScore(game.score);
  }, [game.score, onScore]);

  // A game that is already over when it loads (a reload) was submitted earlier,
  // so only a game that ends during play submits its score.
  const endedOnLoad = useRef(over);
  const submitted = useRef(false);
  useEffect(() => {
    if (!over || endedOnLoad.current || submitted.current) return;
    submitted.current = true;
    if (dateKey) {
      updateDailyBest(game.score);
      if (game.score > 0) void submitDailyScore(dateKey, game.score);
    }
    // updateDailyBest changes identity each render; the game ending is what matters.
  }, [over, dateKey, game.score]);

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

  const button = "min-h-11 whitespace-nowrap rounded-full px-5 py-2 font-semibold disabled:opacity-40";
  const accent = { background: "var(--accent)", color: "#ffffff" };

  return (
    <div className="play-area">
      <p className="play-score text-center text-sm" style={{ color: "var(--muted)" }}>
        Score {game.score}
        {dateKey && ` · Best ${Math.max(dailyBest, game.score)}`}
      </p>
      <div className="play-board">
        <Board grid={game.grid} selected={game.selected} match={match} hint={game.hint} won={won} onTap={handleTap} />
      </div>

      <div className="play-controls flex flex-col items-center gap-3">
      {won ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-bold">Board cleared! Score {game.score}.</p>
          <button type="button" onClick={onNext} className={button} style={accent}>
            Next deal
          </button>
        </div>
      ) : over ? (
        <div className="flex flex-col items-center gap-3">
          <p className="font-semibold">No moves left. Final score {game.score}.</p>
          <button
            type="button"
            onClick={() => {
              clearProgress(key);
              onRestart();
            }}
            className={button}
            style={accent}
          >
            Play again
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setGame((current) => undo(current))} disabled={game.history.length === 0} className={button} style={accent}>
              Undo
            </button>
            {game.hint ? (
              <button type="button" onClick={() => setGame((current) => dismissHint(current))} className={button} style={accent}>
                Dismiss hint
              </button>
            ) : (
              <button type="button" onClick={() => setGame((current) => requestHint(current))} disabled={game.hintSpent} className={button} style={accent}>
                Hint
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setGame((current) => addNumbers(current))}
            disabled={addsLeft(game) <= 0}
            className={`self-center ${button}`}
            style={accent}
          >
            Add numbers ({addsLeft(game)}/{ADD_ALLOWANCE})
          </button>
        </>
      )}
      </div>
    </div>
  );
}
