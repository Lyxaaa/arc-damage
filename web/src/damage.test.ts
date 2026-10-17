import { describe, expect, it } from 'vitest'
import { shotsToBreak, type Weapon } from './damage'
import type { PartInfo } from './parts'

const anvil: Weapon = { id: 'Anvil', ammo: 'HeavyAmmo', damage: 40, projectilesPerShot: 1, critMult: 2.5, armorMult: 1.5, propagationMult: 1, fireRate: 50, magazine: 6, assumedDefaults: [] }
const p = (o: Partial<PartInfo>): PartInfo => ({ bone: 'x', parent: null, tags: [], layer: 'component', resist: 'Normal', ...o })

describe('shotsToBreak', () => {
  const thruster = p({ bone: 'Thruster_L_01', hp: 345 })
  const plate = p({ bone: 'ThrusterArmor_01', parent: 'Thruster_L_01', layer: 'armor', hp: 24 })
  it('breaks a medium plate in one Anvil hit (40 x 1.5 >= 24)', () => {
    expect(shotsToBreak(anvil, plate, [thruster, plate]).withArmor).toBe(1)
  })
  it('counts hits on the part with and without armour', () => {
    const r = shotsToBreak(anvil, thruster, [thruster, plate])
    expect(r.armor).toEqual([{ bone: 'ThrusterArmor_01', hits: 1 }])
    expect(r.withArmor).toBe(9) // 345 / (40 x 1.0)
    expect(r.exposed).toBe(9)
  })
  it('returns null for untracked HP', () => {
    expect(shotsToBreak(anvil, p({}), []).exposed).toBeNull()
  })
})
