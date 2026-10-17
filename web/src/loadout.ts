import { grenadeKill, killPath, type Throwable, type Weapon } from './damage'
import type { PartInfo } from './parts'

export interface Loadout {
  weapon: Weapon | null
  /** Rounds carried for the weapon. */
  rounds: number
  throwable: Throwable | null
  grenades: number
  /** Fraction of projectiles/grenades that land, 0..1. */
  accuracy: number
}

export type Verdict = 'Short' | 'Close' | 'Comfortable' | 'Decimating'

export interface LoadoutResult {
  /** Fraction of one kill the loadout delivers (1 = exactly enough). */
  coverage: number
  verdict: Verdict
  weaponKills: number
  grenadeKills: number
}

export const verdictFor = (c: number): Verdict => (c < 1 ? 'Short' : c < 1.25 ? 'Close' : c < 2 ? 'Comfortable' : 'Decimating')

/**
 * Weapon and grenades each deliver a fraction of the cheapest estimated kill path;
 * the fractions add. Built on the unreviewed per-ARC estimates, so it is an estimate too.
 */
export function evaluate(l: Loadout, parts: PartInfo[]): LoadoutResult | null {
  const kp = l.weapon ? killPath(l.weapon, parts) : null
  const gk = l.throwable ? grenadeKill(l.throwable, parts) : null
  if (!kp && !gk) return null
  const projectiles = l.rounds * (l.weapon?.projectilesPerShot ?? 1)
  const weaponKills = kp && kp.total > 0 ? (projectiles * l.accuracy) / kp.total : 0
  const grenadeKills = gk && gk.count > 0 ? (l.grenades * l.accuracy) / gk.count : 0
  const coverage = weaponKills + grenadeKills
  return { coverage, verdict: verdictFor(coverage), weaponKills, grenadeKills }
}
