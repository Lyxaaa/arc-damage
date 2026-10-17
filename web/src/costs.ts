export interface CostEntry {
  rtId: string
  value: number | null
  recipe: Record<string, number> | null
  craftBench: string | string[] | null
  stationLevel: number | null
  vendors: { cost: Record<string, number>; trader?: string }[] | null
}
export interface Costs {
  weapons: Record<string, CostEntry>
  throwables: Record<string, CostEntry>
  ammo: Record<string, CostEntry>
}

export interface LoadoutCost {
  /** Sum of item values in coins; items with no known value are listed in `unknown`. */
  value: number
  lines: { label: string; qty: number; each: number | null; recipe: Record<string, number> | null; bench: string | null; vendor: string | null }[]
  unknown: string[]
}

const bench = (e: CostEntry) => (Array.isArray(e.craftBench) ? e.craftBench[0] : e.craftBench) ?? null
const vendor = (e: CostEntry) => {
  const v = e.vendors?.find((x) => x.cost.coins != null)
  return v ? `${v.trader ?? 'vendor'} ${v.cost.coins}` : null
}

export function loadoutCost(
  costs: Costs,
  l: { weapon?: { id: string; name?: string; ammo: string } | null; rounds: number; throwable?: { id: string; name?: string } | null; grenades: number },
): LoadoutCost {
  const out: LoadoutCost = { value: 0, lines: [], unknown: [] }
  const add = (label: string, qty: number, e?: CostEntry) => {
    if (!e || e.value == null) return out.unknown.push(label)
    out.value += e.value * qty
    out.lines.push({ label, qty, each: e.value, recipe: e.recipe, bench: bench(e), vendor: vendor(e) })
  }
  if (l.weapon) {
    add(l.weapon.name ?? l.weapon.id, 1, costs.weapons[l.weapon.id])
    if (l.rounds > 0) add(`${l.weapon.ammo} rounds`, l.rounds, costs.ammo[l.weapon.ammo])
  }
  if (l.throwable && l.grenades > 0) add(l.throwable.name ?? l.throwable.id, l.grenades, costs.throwables[l.throwable.id])
  return out
}
