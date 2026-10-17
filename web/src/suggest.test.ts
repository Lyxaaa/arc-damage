import { describe, expect, it } from 'vitest'
import { catchAll, suggestForArc } from './suggest'
import { evaluate } from './loadout'
import type { Weapon } from './damage'
import type { PartInfo } from './parts'

const w: Weapon = { id: 'W', name: 'Wpn', ammo: 'x', damage: 100, projectilesPerShot: 1, critMult: 1, armorMult: 1, propagationMult: 1, fireRate: 1, magazine: 1, assumedDefaults: [] }
const frame: PartInfo = { bone: 'F', parent: null, tags: [], layer: 'frame', resist: 'Normal', hp: 1000 }
const t = { id: 'G', damage: { ExplosiveDamage: 500 } }

describe('suggestions', () => {
  it('tier counts reach their verdict margins', () => {
    const [s] = suggestForArc([w], [], [frame])
    expect(s.counts).toEqual([10, 18, 29])
    const cov = (n: number, acc: number) => evaluate({ weapon: w, rounds: n, throwable: null, grenades: 0, accuracy: acc }, [frame])!.coverage
    expect(cov(s.counts[0], 1)).toBeGreaterThanOrEqual(1)
    expect(cov(s.counts[1], 0.7)).toBeGreaterThanOrEqual(1.25)
    expect(cov(s.counts[2], 0.7)).toBeGreaterThanOrEqual(2)
  })
  it('includes the best grenade', () => {
    expect(suggestForArc([], [t], [frame])[0].counts).toEqual([2, 4, 6])
  })
  it('catch-all needs most ARCs killable', () => {
    expect(catchAll([w], [[frame], [frame]])[0].median).toBe(18)
    expect(catchAll([w], [[frame], []])).toEqual([])
  })
})
