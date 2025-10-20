# 🧠 Patch Summary — Bitget One-Position Guard Integration

## 🔒 Purpose
This patch ensures that your backend **never opens multiple positions on the same symbol** or flips direction (long ↔ short) too quickly.  
It adds lightweight position guarding directly inside `server/services/bitgetApi.ts`, while allowing TP/SL and trailing-stop orders to execute normally.

---

## 📁 Files Added
| File | Description |
|------|--------------|
| `server/core/positionGuard.ts` | Shared class managing locks, cooldowns, and active-symbol tracking. |
| `server/services/enterWithGuard.ts` | Optional helper service (wrapper) for guarded entries. |
| `server/services/bitgetApi.ts` | Patched to use the `PositionGuard` directly before entry orders. |

---

## ⚙️ How It Works
1. **Guard creation**
   ```ts
   import { PositionGuard, Side } from '../core/positionGuard';
   const positionGuard = new PositionGuard(10_000); // 10-second cooldown
   ```

2. **Entry check (inside `placeOrder`)**
   ```ts
   const mappedSide: Side = orderParams.side === 'buy' ? 'long' : 'short';

   if (!positionGuard.canEnter(orderParams.symbol, mappedSide))
     return { ok: false, reason: 'blocked_by_guard' };

   if (!positionGuard.begin(orderParams.symbol, mappedSide))
     return { ok: false, reason: 'already_locked' };

   const pos = await this.getActivePositionForSymbol(orderParams.symbol);
   if (pos?.size) {
     const reason =
       pos.side === mappedSide ? 'same_side_already_open' : 'opposite_side_open';
     positionGuard.end(orderParams.symbol, mappedSide, 7_000);
     return { ok: false, reason };
   }
   ```

3. **After any order completion or error**
   ```ts
   finally {
     positionGuard.end(orderParams.symbol, mappedSide, 7_000);
   }
   ```

---

## ✅ Behavior Summary
| Scenario | Result |
|-----------|--------|
| No active position → place new order | ✅ Allowed |
| Same side already open | ⛔ `same_side_already_open` |
| Opposite side open | ⛔ `opposite_side_open` |
| Rapid re-entries within cooldown | ⛔ `blocked_by_guard` |
| TP / SL / Trailing Stop (reduceOnly) | ✅ Allowed (not guarded) |

---

## 🧩 Optional Helpers
- **`enterWithGuard.ts`** — an optional reusable wrapper for bots or scanners that need their own guard calls.
- **Scanner “start-once” guard** (optional next improvement) — prevents duplicate scanner processes; can be added in `server/index.ts` later.

---

## 🧪 Testing Checklist
1. ✅ Place a single order — only one executes.  
2. ⛔ Re-click or signal multiple entries — guard blocks duplicates.  
3. ⛔ Try same-side or opposite-side entry — correctly rejected.  
4. ✅ TP/SL/Trailing orders still execute.  
5. ✅ Log outputs show reasons (`blocked_by_guard`, `same_side_already_open`, etc.).

---

## 🧰 Maintenance Notes
- `PositionGuard` is stateless per process. If you cluster or scale horizontally, store guard state in Redis or a shared cache.
- Adjust default cooldown via:
  ```ts
  new PositionGuard(15000); // 15s
  ```
- Extend guard logic if you later add multi-symbol batch trading.

---

## 🧾 Revision
- **Date:** October 2025  
- **Applied by:** [Your name or team]  
- **Scope:** Backend only (frontend optional).  
- **Version:** Guard Integration v1.0  
