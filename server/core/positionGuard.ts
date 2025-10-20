// Prevent simultaneous entries per symbol and stop opposite-side churn.

export type Side = 'long' | 'short';
type LockKey = `${string}:${Side}`;

export class PositionGuard {
  private active = new Set<string>();                 // symbols with an active position
  private locks = new Set<LockKey>();                 // in-flight entries (symbol+side)
  private cooldownUntil = new Map<string, number>();  // symbol -> epoch ms

  constructor(private defaultCooldownMs = 10_000) {}

  isCoolingDown(symbol: string, now = Date.now()) {
    const until = this.cooldownUntil.get(symbol);
    return !!until && now < until;
  }

  canEnter(symbol: string, _side: Side, now = Date.now()): boolean {
    if (this.isCoolingDown(symbol, now)) return false;
    if (this.active.has(symbol)) return false; // any active pos → block new entries
    return true;
  }

  begin(symbol: string, side: Side): boolean {
    const key: LockKey = `${symbol}:${side}`;
    if (this.locks.has(key) || this.active.has(symbol)) return false;
    this.locks.add(key);
    this.active.add(symbol);
    return true;
  }

  end(symbol: string, side: Side, cooldownMs = this.defaultCooldownMs) {
    const key: LockKey = `${symbol}:${side}`;
    this.locks.delete(key);
    this.active.delete(symbol);
    if (cooldownMs > 0) this.cooldownUntil.set(symbol, Date.now() + cooldownMs);
  }
}
