// Builds web/public/data/costs.json from the community RaidTheory dataset
// (prices/recipes/vendors are server-side and not in the game files).
// Fetch the dataset first: node scripts/fetch-raidtheory.mjs
import fs from 'node:fs'
import path from 'node:path'

const RT = 'data/raw/raidtheory/items'
const OUT = 'web/public/data/costs.json'
const load = (id) => {
  const f = path.join(RT, id + '.json')
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const trim = (id, d, extra = {}) => ({
  rtId: id,
  value: d.value ?? null,
  recipe: d.recipe ?? null,
  craftBench: d.craftBench ?? null,
  stationLevel: d.stationLevelRequired ?? null,
  vendors: d.vendors ?? null,
  ...extra,
})

const weapons = JSON.parse(fs.readFileSync('web/public/data/weapons.json', 'utf8'))
const throwables = JSON.parse(fs.readFileSync('web/public/data/throwables.json', 'utf8'))
const out = { source: 'RaidTheory/arcraiders-data (community)', weapons: {}, throwables: {}, ammo: {}, unmatched: [] }

// RaidTheory ids the game ids/names don't map to by slug
const THROWABLE_RT = {
  HEGrenade: 'heavy_fuze_grenade',
  BasicStickyGrenade: 'snap_blast_grenade',
  StickyRemoteGrenade: 'trigger_nade',
  TimedMine_Explosive: 'explosive_mine',
  HomingMissileGrenade_01: 'seeker_grenade',
  ScatterMissileGrenade: 'wolfpack',
  ImpactGrenade_Small: 'light_impact_grenade',
}
const AMMO_RT = { LightAmmo: 'light_ammo', MediumAmmo: 'medium_ammo', HeavyAmmo: 'heavy_ammo', ShotgunAmmo: 'shotgun_ammo', LauncherAmmo: 'launcher_ammo', EnergyAmmo: 'energy_clip' }

for (const w of weapons) {
  const s = w.name === 'IlToro' ? 'il_toro' : slug(w.name)
  const id = [s + '_i', s].find((c) => load(c))
  if (!id) { out.unmatched.push(w.id); continue }
  const bp = load(s + '_blueprint')
  out.weapons[w.id] = trim(id, load(id), { blueprintValue: bp?.value ?? null })
  if (w.ammo && AMMO_RT[w.ammo] && !out.ammo[w.ammo]) out.ammo[w.ammo] = trim(AMMO_RT[w.ammo], load(AMMO_RT[w.ammo]) ?? {})
}
for (const t of throwables) {
  const id = THROWABLE_RT[t.id] ?? slug(t.name)
  const d = load(id)
  if (!d) { out.unmatched.push(t.id); continue }
  out.throwables[t.id] = trim(id, d)
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log(`weapons ${Object.keys(out.weapons).length}/${weapons.length}, throwables ${Object.keys(out.throwables).length}/${throwables.length}, ammo ${Object.keys(out.ammo).length}`)
console.log('unmatched:', out.unmatched.join(', ') || 'none')
