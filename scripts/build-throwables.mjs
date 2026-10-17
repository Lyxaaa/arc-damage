// raw GE_* damage effects + sibling BP radius -> web/public/data/throwables.json
import fs from 'node:fs'
import path from 'node:path'

const root = 'data/raw/items/Items'
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))

const out = []
for (const f of walk(root).filter((f) => /\/GE_[^/]*\.json$/.test(f) && !f.includes('/Firearms/'))) {
  const cdo = JSON.parse(fs.readFileSync(f, 'utf8')).find((e) => e.Name?.startsWith('Default__'))
  const dmg = {}
  for (const m of cdo?.Properties?.Modifiers ?? []) {
    const name = m.Attribute?.AttributeName
    const v = m.ModifierMagnitude?.ScalableFloatMagnitude?.Value
    if (name && /Damage/.test(name) && v !== undefined && m.ModifierOp === 'EGameplayModOp::Override') dmg[name] = v
  }
  if (!Object.keys(dmg).length) continue
  const dir = path.dirname(f)
  const radii = []
  for (const b of fs.readdirSync(dir).filter((n) => n.startsWith('BP_'))) {
    const s = fs.readFileSync(path.join(dir, b), 'utf8')
    for (const m of s.matchAll(/"(ManualRadius|Radius|AreaSpreadRadius)": ([\d.]+)/g)) radii.push(+m[2])
  }
  out.push({ id: path.basename(dir), effect: path.basename(f, '.json'), damage: dmg, radiiCm: [...new Set(radii)] })
}
fs.mkdirSync('web/public/data', { recursive: true })
fs.writeFileSync('web/public/data/throwables.json', JSON.stringify(out, null, 1))
for (const t of out) console.log(t.id.padEnd(32), JSON.stringify(t.damage), t.radiiCm.join('/'))
