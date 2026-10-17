import { describe, expect, it } from 'vitest'
import { loadoutCost, type Costs } from './costs'

const e = (value: number | null) => ({ rtId: 'x', value, recipe: { metal_parts: 2 }, craftBench: ['workbench'], stationLevel: 1, vendors: null })
const costs: Costs = { weapons: { W: e(475) }, throwables: { G: e(1600) }, ammo: { HeavyAmmo: e(12) } }

describe('loadoutCost', () => {
  it('sums weapon, rounds and grenades', () => {
    const r = loadoutCost(costs, { weapon: { id: 'W', ammo: 'HeavyAmmo' }, rounds: 30, throwable: { id: 'G' }, grenades: 2 })
    expect(r.value).toBe(475 + 30 * 12 + 2 * 1600)
    expect(r.lines[0].bench).toBe('workbench')
  })
  it('lists items with no price as unknown', () => {
    const r = loadoutCost(costs, { weapon: { id: 'missing', ammo: 'HeavyAmmo' }, rounds: 10, grenades: 0 })
    expect(r.unknown).toEqual(['missing'])
    expect(r.value).toBe(120)
  })
})
