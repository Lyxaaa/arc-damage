import { describe, expect, it } from 'vitest'
import { evaluate, verdictFor, type Loadout } from './loadout'
import type { Weapon } from './damage'
import type { PartInfo } from './parts'

const w: Weapon = { id: 'W', ammo: 'x', damage: 100, projectilesPerShot: 1, critMult: 1, armorMult: 1, propagationMult: 1, fireRate: 1, magazine: 1, assumedDefaults: [] }
const frame: PartInfo = { bone: 'F', parent: null, tags: [], layer: 'frame', resist: 'Normal', hp: 1000 }
const base: Loadout = { weapon: w, rounds: 10, throwable: null, grenades: 0, accuracy: 1 }

describe('evaluate', () => {
  it('needs 10 hits for 1000 HP at 100 damage', () => {
    expect(evaluate(base, [frame])?.coverage).toBe(1)
  })
  it('accuracy scales delivered damage', () => {
    expect(evaluate({ ...base, accuracy: 0.5 }, [frame])?.verdict).toBe('Short')
  })
  it('adds grenade contribution', () => {
    const t = { id: 'G', damage: { ExplosiveDamage: 500 } }
    expect(evaluate({ ...base, rounds: 0, throwable: t, grenades: 2 }, [frame])?.coverage).toBe(1)
  })
  it('verdict thresholds', () => {
    expect([0.9, 1, 1.25, 2].map(verdictFor)).toEqual(['Short', 'Close', 'Comfortable', 'Decimating'])
  })
  it('returns null with nothing selected', () => {
    expect(evaluate({ ...base, weapon: null }, [frame])).toBeNull()
  })
})
