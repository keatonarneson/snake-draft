# Engine algorithms & formulas

Reference for the math in `src/engine/`. Every function here is pure TypeScript with no
React dependency, so it should port directly if/when the app moves to a different framework.

The scoring math is still being tuned — treat constants and formulas as a snapshot, not a spec.
Tunable numbers that have been centralized live in [`config.ts`](../src/engine/config.ts) and
[`rosterConfig.ts`](../src/engine/rosterConfig.ts); everything else is inline near its use.

---

## 1. Snake draft order

**File:** [`draftOrder.ts`](../src/engine/draftOrder.ts) — `generateDraftSequence(numTeams, numRounds)`

Standard snake order: odd rounds go 1→N, even rounds go N→1.

```
teamIndex = isEvenRound ? numTeams - pickInRound : pickInRound - 1
```

Produces a flat `DraftPick[]` of length `numTeams * numRounds`, each with `overallPick`,
`round`, `pickInRound`, and `teamIndex` (0-indexed).

---

## 2. Return probability (will a player survive to my next pick?)

**File:** [`draftProbability.ts`](../src/engine/draftProbability.ts)

Models each player's likely draft position as a **truncated normal distribution** centered on
their ADP, bounded by their scouted `minPick`/`maxPick` range.

**`erf(x)`** — Abramowitz & Stegun rational approximation of the error function (~1.5e-7 accuracy).

**`normalCDF(x)`** — standard normal CDF: `0.5 * (1 + erf(x / √2))`.

**`truncatedNormalCDF(p, adp, minPick, maxPick)`** — CDF of the normal distribution
`N(adp, σ)` truncated to `[minPick, maxPick]`, where `σ = max(1, (maxPick - minPick) / 4)`:

```
Φ(p)    = normalCDF((p - adp) / σ)
Φ(min)  = normalCDF((minPick - adp) / σ)
Φ(max)  = normalCDF((maxPick - adp) / σ)
CDF(p)  = (Φ(p) - Φ(min)) / (Φ(max) - Φ(min))     // clamped to [0, 1]
```

**`calculateReturnProbability(pCurr, pNext, player)`** — probability the player is still
available at your next pick, conditioned on them being available now:

```
pReturn = (1 - CDF(pNext)) / (1 - CDF(pCurr))     // clamped to [0, 1]
```

Used everywhere a "will this player return" number is needed: recommendations, position
scarcity, target metrics.

---

## 3. Position scarcity

**File:** [`positionScarcity.ts`](../src/engine/positionScarcity.ts) — `calculatePositionScarcity(...)`

For each position, estimates how much value is lost by waiting one more turn.

- **Replacement value** — the value of the player at league rank `numTeams × POSITION_SLOTS[pos]`
  (roster-slot weights: C 2.0, 1B/2B/3B/SS 1.5, OF 5.75, SP 6.5, RP 2.5 — closers only for RP).
- **Expected best value/rank next** — walks the position's remaining players best-to-worst,
  weighting each by the probability they're gone before your next pick and the probability all
  better players are already gone (`probAccum`), i.e. an expectation over "who is the best player
  still there when I pick again":

  ```
  probAccum = 1.0                                   // P(all better players already gone)
  for each player (best → worst):
    pReturn = calculateReturnProbability(pCurr, pNext, player)
    expectedBestValueNext += player.value * pReturn * probAccum
    expectedBestRankNext  += rank * pReturn * probAccum
    probAccum *= (1 - pReturn)                      // stop early once probAccum < 0.0001
  ```

- **`valueDropOff`** = `max(0, bestValueNow - expectedBestValueNext)`.
- **`scarcityPressure`** = `remainingDemand / viableSupply`, clamped to `[0.5, 2.0]`, where
  `remainingDemand = numTeams × slots − alreadyDrafted` and `viableSupply` = remaining players
  at/above replacement value.
- **`positionRankPremium`** = `min(2.00, expectedBestRankNext × rankScarcityCoeff × scarcityPressure)`
  — a rank-based bonus (not just $-based) capped at $2, tunable via the sandbox's
  "Rank scarcity" coefficient (default 0.15).
- **`dropOff`** = `valueDropOff + positionRankPremium`.
- **`marketPressureScore`** — sums `(1 - pReturn)` over the top 8 ADP-soonest viable players at
  the position; `marketPressureLevel` buckets into low/medium/high off that score and the
  single most-imminent player's return probability.

---

## 4. Category needs (rotisserie gap analysis)

**File:** [`categoryNeeds.ts`](../src/engine/categoryNeeds.ts)

Compares a roster's projected category totals against league-wide season targets
(`LEAGUE_TARGETS` in [`config.ts`](../src/engine/config.ts)) to produce a per-category "need"
factor in roughly `[-1.5, 1.8]` (negative = surplus, positive = need).

**Counting stats** (R, HR, RBI, SB, W, SV, SO) — need scales with how far behind pace the roster
is, where pace is the target scaled by roster fill:

```
fillRatio    = min(1, battersOnRoster / 14)         // or pitchersOnRoster / 9
expectedPace = target * fillRatio
need         = clamp(1 - current/expectedPace, -1.5, 1.8)
```

**Rate stats** (AVG, ERA, WHIP) — compares the roster's AB/IP-weighted average rate to the
target ratio directly (no pace scaling, since a rate doesn't accumulate with more players):

```
ratio = current / target
need  = lowerIsBetter ? clamp(ratio - 1, -1.5, 1.8)        // ERA, WHIP: higher ratio = more need
             : clamp(1 - ratio, -1.5, 1.8)                  // AVG: lower ratio = more need
```

AVG/ERA/WHIP needs are then doubled (`× 2`) relative to counting stats when combined, since one
rate-stat player moves the roster's average much less than a counting-stat player moves a sum.

**`calculateStatsAdjustment(player, needs)`** — converts a candidate player's stats into a
single score bump, by multiplying each stat's deviation from a league-average baseline by that
category's need factor and a per-category weight (SB and AVG weighted highest among hitting;
SV weighted highest among pitching), summed and clamped to `[-8, 8]`.

---

## 5. Roster fitting (active vs. bench)

**Files:** [`rosterConfig.ts`](../src/engine/rosterConfig.ts) (shared 23-slot layout: 2C, 1B,
2B, 3B, SS, CI, MI, 5×OF, UT, 9×P), [`rosterFit.ts`](../src/engine/rosterFit.ts) (auto-fit by
value, used by the engine), [`rosterSlots.ts`](../src/engine/rosterSlots.ts) (manual-assignment-
aware fit, used by the roster tracker UI).

Both greedily fill slots **highest-value player first**, in three priority passes:

1. Priority 1 — dedicated position slots (C, 1B, 2B, 3B, SS, 5×OF, 9×P)
2. Priority 2 — semi-flexible slots (CI = 1B/3B, MI = 2B/SS)
3. Priority 3 — fully flexible slot (UT = any non-catcher hitter)

Anyone left over is bench. `rosterSlots.ts` additionally respects any slot the user manually
dragged a player into before running the same three passes on whoever's left.

---

## 6. CPU opponent scoring

**File:** [`cpuScoring.ts`](../src/engine/cpuScoring.ts) — `calculateCpuScore(...)`

Simulates how a CPU-controlled opponent values a candidate player, as a sum of eleven signed
components. All phase-dependent constants are bucketed by round via a shared `byPhase(round,
early, mid, late)` helper (≤5 / ≤15 / >15).

| # | Component | Formula sketch |
|---|---|---|
| 1 | **Base value** | Blend of ADP-implied $ (`calculateAdpValue`, a decaying power curve: `45 − 1.8·(adp−1)^0.6`, floored at $1) and consensus $, weighted by round/archetype/profile trust, then scaled by the profile's hitter/pitcher preference. |
| 2 | **Roster need bonus** | `maxRosterNeed(round, profile) × positionNeedScore`, where `positionNeedScore` (0–1) depends on how thin the roster is at that position/role (catcher, closer, or generic), and is 0.25 flat if the player would be a bench add. |
| 3 | **Category need bonus** | `maxCatBonus(round, profile) × normalize(calculateStatsAdjustment(player, roster's categoryNeeds) / 4)`, suppressed to 15% once saves are "solved" for a closer candidate. |
| 4 | **Position run bonus** | Looks at the last 12 picks league-wide; if ≥3 players at a position were just taken (≥2 for RP), applies a bonus scaled by how much the CPU still needs that position — models "run" panic-drafting. |
| 5 | **Scarcity bonus** | Pulls the player's best `positionRankPremium` from the shared `positionScarcity` map, capped per-round and scaled by the profile's `scarcity` weight. |
| 6 | **Role security bonus** | Rewards proven usage (AB ≥ 520 hitters, IP ≥ 150 starters, SV ≥ 25 closers) and penalizes uncertain roles, scaled by round. |
| 7 | **Upside bonus** | `max(min(1, (maxSystemValue − consensusValue)/5), min(1, (maxPick − adp)/30) × 0.5)`, scaled by round + archetype ("upside" CPUs get 1.4×). |
| 8 | **Random noise** | `N(0, σ)` (Box–Muller, see `randomNormal`) with round/archetype/profile-scaled σ and clamp — or a deterministic `(fixedRand − 0.5) × 2σ` when re-scoring a manual pick for the draft log (no randomness there). |
| 9 | **Reach penalty** | Charges per-pick-over-ADP once a phase-specific "slack" window is exceeded (6 picks / round ≤5, 15 / ≤15, 30 / >15), at a phase-specific per-pick cost (1.5 / 0.8 / 0.3), divided by the profile's `reachTolerance`. |
| 10 | **Roster penalty** | Flat penalties for 2nd catcher, exceeding the closer plan's target/max, an extra RP once saves are solved, batter-heavy rosters, and a 7th+ OF. |
| 11 | **Urgency bonus** | Rewards players who've already slid past their ADP, and heavily rewards ones about to age out of their scouted range (`pCurr ≥ maxPick` → +6 flat; within 10 picks of `maxPick` → sliding bonus). |
| 12 | **Saves strategy bonus** | Archetype-independent adjustment layered on top for RP-eligible players: aggressive strategies chase closers early, "wait" strategies penalize any RP before round 10, balanced strategies nudge mid-draft. |

```
score = baseValue + rosterNeedBonus + categoryNeedBonus + positionRunBonus + scarcityBonus
      + roleSecurityBonus + upsideBonus + randomNoise + urgencyBonus + savesStrategyBonus
      - reachPenalty - rosterPenalty
```

**CPU archetypes & profiles** ([`cpuProfiles.ts`](../src/engine/cpuProfiles.ts)) — 8 named
templates (Balanced, Market Anchor, Projection Value, Roster Builder, Upside Chaser, Pitching
Foundation, Bat First, Closer Chaser), each a vector of ~13 multipliers (market/projection trust,
roster/category need weight, scarcity weight, run reaction, upside, reach tolerance,
pitcher/hitter preference, closer aggression, randomness) that feed into the components above.
Teams are assigned a profile round-robin by team index, skipping the user's slot.

**`getCpuCloserPlan(profile, strategy)`** — target/max closer counts: aggressive → target 2 max 3,
wait → target 1 max 2, balanced → target 2 max 2.

---

## 7. CPU pick selection

**File:** [`cpuDraft.ts`](../src/engine/cpuDraft.ts) — `selectCpuPick(...)`

Wraps `calculateCpuScore` with the performance and realism work needed to actually pick a player:

1. **Type constraint** — once a CPU roster is batter- or pitcher-full (14/9 active + remaining
   bench slots), restrict candidates to the other type.
2. **Closer block** — once a CPU has hit its closer plan's max or "solved" saves (2 premium
   closers), excludes further closers from consideration.
3. **Market shortlist** — full-pool scoring is too slow with large CSVs, so first filters to a
   round-scaled ADP/maxPick/value window (36–180 picks ahead depending on round) and sorts by a
   cheap urgency/distance/value heuristic, keeping only the top 60–220 candidates before running
   the expensive `calculateCpuScore` on each.
4. **Weighted random pick, not argmax** — takes the top 3–15 scored candidates (pool size shrinks
   in early rounds for more "correct" picks, widens later for realism), converts scores to
   weights via `(score - minScore + 1)^3` (cubic — favors the top of the pool heavily but still
   allows upsets), and picks one via weighted-random draw. This is what makes mock drafts non-
   deterministic and occasionally "wrong" like a real draft.

---

## 8. Recommendations (advice for the user)

**File:** [`recommendations.ts`](../src/engine/recommendations.ts) — `getRecommendations(...)`

A separate, simpler scoring model than CPU scoring — optimized for *explaining* a pick, not
*simulating* one. Round determines a **phase** (early ≤5 / middle 6–14 / late ≥15) with baked-in
weights, which the sandbox sliders then multiply:

| Phase | needs | scarcity | reach | upside | benchDiscount |
|---|---|---|---|---|---|
| early | 0.0 (pure best-player-available) | 0.3 | 1.5 (strict) | 0.0 | 0.40 |
| middle | 1.0 | 1.2 | 0.4 | 0.3 | 0.50 |
| late | 1.5 (chase needs) | 0.4 | 0.0 (no penalty) | 1.8 (chase sleepers) | 0.90 |

```
pReturn         = calculateReturnProbability(pCurr, pNext, player)
scarcityDropOff = max over player's positions of:
                    valuePreservation + scarcityRank
                  where valuePreservation = max(0, player.value − expectedBestValueNext)
                        qualityWeight     = clamp((player.value − replacementValue)
                                                    / (bestValueNow − replacementValue), 0, 1)
                        scarcityRank      = positionRankPremium × qualityWeight

statsAdjustment = calculateStatsAdjustment(player, needs) × w_needs

reachPenalty    = 0                                          if adp ≤ pCurr + 12
                = logistic(reachPicks) clamped to [-15, 0]   otherwise
                  // logistic(x) = -15 / (1 + e^(-0.3·(x - 5)))  — smooth ramp, not a hard cliff

upsideBonus     = min(6, ((adp − minPick) / 8) × w_upside)    // 0 if w_upside is 0

baseScore = player.value × w_projections
          + statsAdjustment
          + scarcityDropOff × w_scarcity × w_urgency
          + upsideBonus
          + reachPenalty                                     // note: subtracted via negative value
          + (1 − pReturn) × max(0, player.value) × 0.35 × w_urgency   // urgencyBonus

finalScore = isBench ? baseScore × benchDiscount (if positive, else × (2 − benchDiscount))
                     : baseScore
```

A 3rd catcher is penalized hard regardless of score sign (`baseScore × 0.05 − 25` if positive,
else `baseScore − 25`) since a roster essentially never needs one.

**`getRecommendationTiming(...)`** classifies each recommendation as **draft / consider / wait**
by comparing `pReturn`, the score gap to the best available player, and how far ahead of market
(ADP vs. current pick) the player is.

---

## 9. Standings projection

**File:** [`standings.ts`](../src/engine/standings.ts) — `calculateProjectedStandings(...)`

For each team: run their drafted roster through `fitRoster` (§5) to get active starters only
(bench doesn't count), then sum category totals via `calculateCategoryStats`
([`categoryStats.ts`](../src/engine/categoryStats.ts) — AB/IP-weighted averages for AVG/ERA/WHIP,
straight sums for counting stats).

**Rotisserie points per category** — sort all teams by that category (ascending for ERA/WHIP,
descending otherwise; teams with zero AB/IP are sorted last), then award points with **tied-group
averaging**: a tied group spanning ranks `[groupStart, groupEnd]` (0-indexed) all receive
`points = ((numTeams - groupStart) + (numTeams - groupEnd)) / 2` — the standard "average of the
ranks the tie occupies" rule, so a 3-way tie for 1st all get the average of what 1st/2nd/3rd
would have paid.

Total `points = sum of hitterPoints (R/HR/RBI/SB/AVG) + sum of pitcherPoints (W/SV/SO/ERA/WHIP)`.
Final `rank` breaks ties by total roster `value`.

---

## 10. Draft capital

**File:** [`draftCapital.ts`](../src/engine/draftCapital.ts) — `calculateDraftCapital(...)`

Assigns each pick a decaying "capital" weight by round, independent of the player actually
taken — a proxy for "how much draft equity did I spend here":

```
capital(round) = max(0.6, 10 × 0.86^(round - 1))
```

Buckets picks into Hit / SP / RP by player type, sums capital per bucket, and expresses each as
a percentage of total capital spent. Feeds a few canned situational notes (e.g. "Early SP capital
is heavy" when SP% ≥ 45 within the first 6 picks).

---

## 11. Target metrics (per-target survival curve)

**File:** [`targetMetrics.ts`](../src/engine/targetMetrics.ts) — `calculateTargetMetrics(...)`

For a single watch-listed player, maps `calculateReturnProbability` (§2) across every remaining
pick the user has, to answer "which of my future picks is the latest round I can still reasonably
wait for this player?" The **optimal pick** is the last one in that list with `pReturn ≥ 0.35`
(falls back to the very next user pick if none clear that bar). **Status** buckets off the
*immediate* next pick's probability: `< 0.20` → gone, `< 0.45` → urgent, else → safe.

---

## Two scoring models, one set of shared primitives

`cpuScoring.ts` (§6, simulates opponents) and `recommendations.ts` (§8, advises the user) are
**intentionally separate models** — different weighting philosophy, different phase boundaries,
different formulas for reach/upside — because one is trying to be realistic and the other is
trying to be *useful advice*, and those aren't the same objective. What they *do* share, so the
two don't drift on category-needs math or roster-fit rules:

- `categoryNeeds.calculateCategoryNeeds` / `calculateStatsAdjustment` (§4)
- `rosterFit.checkPositionalFit` (§5)
- `playerRoles.isDraftableCloser` / `isPremiumCloser`
- `draftProbability.calculateReturnProbability` (§2)
- `playerValue.getConsensusValue` / `getMaxSystemValue` (fallback accessors to `player.value`)
