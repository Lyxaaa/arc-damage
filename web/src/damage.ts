import type { PartInfo } from './parts'

export interface Weapon {
  id: string
  ammo: string
  damage: number
  projectilesPerShot: number
  critMult: number
  armorMult: number
  propagationMult: number
  fireRate: number
  magazine: number
  assumedDefaults: string[]
}

export interface Throwable {
  id: string
  damage: Record<string, number>
}

/**
 * Starting damage model, inferred from the game's data fields, not read from the game's code.
 * Every coefficient is an estimate until the in-game calibration session.
 */
export const MODEL = {
  /** Explosive hits ignore the weapon multipliers; armour takes full damage. */
  explosiveArmorMult: 1,
}

export interface PartShots {
  /** Hits to break the part's own armour plates, one entry per plate. */
  armor: { bone: string; hits: number }[]
  /** Hits on the part while armour is still intact (damage scaled by propagation). */
  withArmor: number | null
  /** Hits once the armour is gone. */
  exposed: number | null
}

const hits = (hp: number | undefined, perHit: number) => (hp === undefined || perHit <= 0 ? null : Math.ceil(hp / perHit))

/** Damage per projectile against armour plate / bare part. */
export function perProjectile(w: Weapon) {
  return { armor: w.damage * w.armorMult, bare: w.damage, behindArmor: w.damage * w.propagationMult }
}

export function shotsToBreak(w: Weapon, part: PartInfo, parts: PartInfo[]): PartShots {
  const d = perProjectile(w)
  if (part.layer === 'armor') return { armor: [], withArmor: hits(part.hp, d.armor), exposed: null }
  const plates = parts.filter((p) => p.parent === part.bone && p.layer === 'armor')
  return {
    armor: plates.map((p) => ({ bone: p.bone, hits: hits(p.hp, d.armor) ?? 0 })),
    withArmor: plates.length ? hits(part.hp, d.behindArmor) : null,
    exposed: hits(part.hp, d.bare),
  }
}

/** Grenade hits to break a part; armour is not distinguished (see MODEL). */
export function grenadesToBreak(t: Throwable, part: PartInfo): number | null {
  const dmg = t.damage.ExplosiveDamage
  return hits(part.hp, dmg === undefined ? 0 : dmg * MODEL.explosiveArmorMult)
}
