import { grenadeKill, hitsPerShot, killPath, type Throwable, type Weapon } from './damage'
import type { PartInfo } from './parts'

export interface Tier {
  label: 'Minimum' | 'Ideal' | 'In case you miss'
  /** Target coverage of one kill. */
  margin: number
  /** Accuracy the tier assumes. */
  accuracy: number
}

export const TIERS: Tier[] = [
  { label: 'Minimum', margin: 1, accuracy: 1 },
  { label: 'Ideal', margin: 1.25, accuracy: 0.7 },
  { label: 'In case you miss', margin: 2, accuracy: 0.7 },
]

export interface Suggestion {
  kind: 'weapon' | 'grenade'
  id: string
  name: string
  /** Rounds or grenades per tier, same order as TIERS. */
  counts: number[]
}

const tierCounts = (perKill: number, perItem: number) =>
  TIERS.map((t) => Math.ceil((t.margin * perKill) / (t.accuracy * perItem)))

/** Per-ARC loadouts: the three weapons needing the fewest rounds, and the best grenade. Estimates only. */
export function suggestForArc(weapons: Weapon[], throwables: Throwable[], parts: PartInfo[]): Suggestion[] {
  const ws: Suggestion[] = []
  for (const w of weapons) {
    const kp = killPath(w, parts)
    if (kp) ws.push({ kind: 'weapon', id: w.id, name: w.name ?? w.id, counts: tierCounts(kp.total, hitsPerShot(w)) })
  }
  ws.sort((a, b) => a.counts[1] - b.counts[1])
  const gs: Suggestion[] = []
  for (const t of throwables) {
    const gk = grenadeKill(t, parts)
    if (gk) gs.push({ kind: 'grenade', id: t.id, name: t.name ?? t.id, counts: tierCounts(gk.count, 1) })
  }
  gs.sort((a, b) => a.counts[1] - b.counts[1])
  return [...ws.slice(0, 3), ...gs.slice(0, 1)]
}

export interface CatchAll {
  id: string
  name: string
  /** Ideal-tier rounds: median and worst case across the ARCs this weapon can kill. */
  median: number
  worst: number
  arcs: number
}

/** Weapons ranked by median Ideal-tier rounds across all ARCs; only weapons that can kill most ARCs qualify. */
export function catchAll(weapons: Weapon[], all: PartInfo[][]): CatchAll[] {
  const out: CatchAll[] = []
  for (const w of weapons) {
    const rounds: number[] = []
    for (const parts of all) {
      const kp = killPath(w, parts)
      if (kp) rounds.push(tierCounts(kp.total, hitsPerShot(w))[1])
    }
    if (rounds.length < all.length * 0.8) continue
    rounds.sort((a, b) => a - b)
    out.push({ id: w.id, name: w.name ?? w.id, median: rounds[Math.floor(rounds.length / 2)], worst: rounds[rounds.length - 1], arcs: rounds.length })
  }
  return out.sort((a, b) => a.median - b.median).slice(0, 3)
}
