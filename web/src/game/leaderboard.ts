// Daily leaderboard for Number Match: highest score per local day.
//
// This calls the documented leaderboard endpoint (platform API-CONTRACT.md, v1
// paths) directly, as Colour Sort does. The SDK's useLeaderboard hook has no
// `period` option, so it can only reach the all-time board.

export const GAME_ID = 'number-match';
const API_BASE = 'https://leaderboard.freegamestore.online/v1';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

/**
 * Posts a daily score. Returns { ok: false } quietly on any failure: an
 * unpublished game ("Invalid game"), signed-out users (401), rate limits, or a
 * network error. The game does not show these.
 */
export async function submitDailyScore(
  date: string,
  score: number,
  fetchImpl: FetchLike = defaultFetch,
): Promise<{ ok: boolean; rank?: number }> {
  if (!Number.isInteger(score) || score < 0) return { ok: false };
  try {
    const res = await fetchImpl(`${API_BASE}/api/scores`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_ID, score, period: date }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { ok?: boolean; rank?: number };
    if (data.ok === false) return { ok: false };
    return data.rank === undefined ? { ok: true } : { ok: true, rank: data.rank };
  } catch {
    return { ok: false };
  }
}
