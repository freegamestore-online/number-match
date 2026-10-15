import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_ID, submitDailyScore, type FetchLike } from './leaderboard.ts';

const DATE = '2026-10-15';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockFetch(response: Response | Error) {
  return vi.fn<FetchLike>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

describe('submitDailyScore', () => {
  let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    // "Invalid game" and other failures must be silent: nothing reaches the console.
    consoleSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the score tagged with the day, using the cookie session', async () => {
    const fetchImpl = mockFetch(jsonResponse(200, { ok: true, rank: 3 }));
    const result = await submitDailyScore(DATE, 120, fetchImpl);

    expect(result).toEqual({ ok: true, rank: 3 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://leaderboard.freegamestore.online/v1/api/scores');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({ game: GAME_ID, score: 120, period: DATE });
  });

  it('treats an unpublished game ("Invalid game", 400) as a quiet failure', async () => {
    const fetchImpl = mockFetch(jsonResponse(400, { error: 'Invalid game' }));
    await expect(submitDailyScore(DATE, 120, fetchImpl)).resolves.toEqual({ ok: false });
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  });

  it('treats a signed-out user (401) as a quiet failure', async () => {
    const fetchImpl = mockFetch(jsonResponse(401, { error: 'Sign in required' }));
    await expect(submitDailyScore(DATE, 120, fetchImpl)).resolves.toEqual({ ok: false });
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  });

  it('treats a network error as a quiet failure', async () => {
    const fetchImpl = mockFetch(new TypeError('Failed to fetch'));
    await expect(submitDailyScore(DATE, 120, fetchImpl)).resolves.toEqual({ ok: false });
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  });

  it('does not call the network for a score that is not a non-negative integer', async () => {
    const fetchImpl = mockFetch(jsonResponse(200, { ok: true }));
    await expect(submitDailyScore(DATE, -10, fetchImpl)).resolves.toEqual({ ok: false });
    await expect(submitDailyScore(DATE, 1.5, fetchImpl)).resolves.toEqual({ ok: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
