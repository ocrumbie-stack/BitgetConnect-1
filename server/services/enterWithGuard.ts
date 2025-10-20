// server/services/enterWithGuard.ts
import { PositionGuard, Side } from '../core/positionGuard';

export type ActivePosition =
  | { side: Side; size: number }
  | null;

export interface EnterDeps {
  // Return current active position for symbol (if any)
  getActivePosition: (symbol: string) => Promise<ActivePosition>;

  // Place an entry order and return an ID/string for logging (or object)
  placeEntry: (symbol: string, side: Side) => Promise<{ id: string } | { orderId: string } | string | void>;

  // Persist any state you normally do after a successful entry
  persistFromEntry?: (opts: {
    symbol: string;
    side: Side;
    reason?: string;
    orderRef?: any;
  }) => Promise<void>;

  // Optional logger
  log?: (level: 'info' | 'warn' | 'error', msg: string, meta?: any) => void;

  // Cooldown in ms after an attempt (success or fail)
  cooldownMs?: number;
}

const guard = new PositionGuard(10_000); // default 10s

export async function enterWithGuard(
  symbol: string,
  side: Side,
  reason: string,
  deps: EnterDeps
): Promise<{ ok: boolean; reason?: string }> {
  const { getActivePosition, placeEntry, persistFromEntry, log, cooldownMs } = deps;

  // 0) De-dupe rapid entries & stop ping-pong (opposite-side flips)
  if (!guard.canEnter(symbol, side)) {
    log?.('warn', 'blocked_by_guard', { symbol, side, reason });
    return { ok: false, reason: 'blocked_by_guard' };
  }
  if (!guard.begin(symbol, side)) {
    log?.('warn', 'already_locked', { symbol, side, reason });
    return { ok: false, reason: 'already_locked' };
  }

  try {
    // 1) Double-check on-exchange state
    const pos = await getActivePosition(symbol);
    if (pos?.size) {
      if (pos.side === side) {
        log?.('info', 'same_side_already_open', { symbol, side, pos });
        return { ok: false, reason: 'same_side_already_open' };
      } else {
        log?.('info', 'opposite_side_open', { symbol, side, pos });
        return { ok: false, reason: 'opposite_side_open' };
      }
    }

    // 2) Place the order
    const orderRef = await placeEntry(symbol, side);

    // 3) Persist if provided
    if (persistFromEntry) {
      await persistFromEntry({ symbol, side, reason, orderRef });
    }

    log?.('info', 'entry_ok', { symbol, side, reason, orderRef });
    return { ok: true };
  } catch (err: any) {
    log?.('error', 'entry_failed', { symbol, side, reason, err: String(err?.message ?? err) });
    return { ok: false, reason: 'error' };
  } finally {
    guard.end(symbol, side, cooldownMs ?? 7_000);
  }
}
