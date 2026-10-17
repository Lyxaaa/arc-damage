// raw item dumps -> web/public/data/weapons.json (one resolved record per base firearm)
import fs from 'node:fs'
import { resolveProps, chain } from './weapons-lib.mjs'

const dir = 'data/raw/items/Items/Firearms'
// Not set anywhere in the blueprint chain, so inherited from the native class. Assumed, not read.
const ASSUMED = { AiArmorDamageMultiplier: 1, AiArmorPropagationMultiplier: 1, CriticalDamageMultiplier: 1, AIWeakSpotDamageMultiplier: 1 }
const tail = (s) => s?.replace(/^.*'(.*)'$/, '$1')

// Display name lives in the item's dialogue tag, e.g. Item.Weapon.Anvil
const nameOf = (id) => {
  const f = `${dir}/${id}/DA_Item_${id}.json`
  if (!fs.existsSync(f)) return id
  return fs.readFileSync(f, 'utf8').match(/Item\.Weapon\.([A-Za-z0-9_]+)/)?.[1] ?? id
}

const out = []
for (const id of fs.readdirSync(dir).sort()) {
  const f = `${dir}/${id}/BP_Item_${id}.json`
  if (!fs.existsSync(f)) continue
  const p = resolveProps(f)
  const assumed = Object.keys(ASSUMED).filter((k) => p[k] === undefined)
  const g = (k) => p[k] ?? ASSUMED[k]
  const shots = p.MultiShot?.reduce((n, m) => n + (m.Projectiles ?? 1), 0)
  out.push({
    id,
    name: nameOf(id),
    type: p.WeaponType?.replace('EWeaponType::', ''),
    ammo: tail(p.AmmoType?.ObjectName)?.replace('DA_Item_', ''),
    damage: p.BasePhysicalDamage,
    projectilesPerShot: shots ?? 1,
    burstSize: p.BurstSize ?? 1,
    critMult: g('CriticalDamageMultiplier'),
    weakSpotMult: g('AIWeakSpotDamageMultiplier'),
    armorMult: g('AiArmorDamageMultiplier'),
    propagationMult: g('AiArmorPropagationMultiplier'),
    fireRate: p.BaseFireRate,
    magazine: p.BaseClipSize,
    reload: p.BaseReloadTime,
    falloffCurve: tail(p.DamageFalloff?.ObjectName),
    chain: chain(f).slice(1),
    assumedDefaults: assumed,
  })
}
fs.mkdirSync('web/public/data', { recursive: true })
fs.writeFileSync('web/public/data/weapons.json', JSON.stringify(out, null, 1))
console.log(out.length, 'weapons;', out.filter((w) => w.assumedDefaults.length).length, 'with assumed defaults')
