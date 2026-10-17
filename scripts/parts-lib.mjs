// Builds the per-ARC part list: glb bone hierarchy + bone->tag maps from CSSC/CSSM dumps.
import { readFileSync, readdirSync, existsSync } from 'node:fs'

export function glbJson(file) {
  const b = readFileSync(file)
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'))
}

export function layerOf(tags, resist) {
  const t = tags.map((x) => x.replace('Part.Decorator.', ''))
  const armor = t.find((x) => x.startsWith('ID.Armor.'))
  if (armor) return { layer: 'armor', armor: armor.slice('ID.Armor.'.length) }
  if (resist === 'Armor') return { layer: 'armor', armor: 'Unclassed' }
  if (resist === 'Critical' || resist === 'WeakPoint' || t.includes('Group.Critical') || t.includes('Group.Weakpoint')) return { layer: 'weakpoint' }
  if (t.includes('Group.Indestructible')) return { layer: 'indestructible' }
  if (t.includes('ID.Frame')) return { layer: 'frame' }
  return { layer: 'component' }
}

// Some ARCs (Bombardier) tag armour only by bone name.
function withNameHeuristic(bone, r) {
  return r.layer === 'component' && /Armor/i.test(bone) ? { layer: 'armor', armor: 'Unclassed' } : r
}

function tagMap(dir) {
  const f = readdirSync(dir).find((x) => /^CSS[CM]_.*\.json$/.test(x))
  if (!f) return null
  const e = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).find((x) => x.Properties?.BoneNameToPartTagsMap)
  const map = {}
  for (const k of ['BoneNameToPartTagsMap', 'BoneNameToExtraPartTagsMap'])
    for (const { Key, Value } of e.Properties[k] ?? []) map[Key] = [...(map[Key] ?? []), ...Value.map((v) => (typeof v === 'string' ? v : v.TagName))]
  const resist = {}
  for (const { Key, Value } of e.Properties.BoneNameToPartResistanceGroup ?? []) resist[Key] = String(Value).split('::')[1]
  return { map, resist }
}

export function buildParts(dir) {
  const tm = tagMap(dir)
  const tags = tm?.map
  const parts = new Map()
  const meshes = readdirSync(dir).filter((f) => f.endsWith('.glb'))
  for (const m of meshes) {
    const j = glbJson(`${dir}/${m}`)
    const parent = new Map()
    j.nodes.forEach((n, i) => n.children?.forEach((c) => parent.set(c, i)))
    for (const [i, n] of j.nodes.entries()) {
      if (n.mesh !== undefined || !n.name || i === 0 || n.name.endsWith('.ao') || parts.has(n.name)) continue
      const p = parent.get(i)
      const pn = p === undefined ? null : j.nodes[p].name
      const t = tags?.[n.name] ?? []
      parts.set(n.name, { bone: n.name, parent: pn && !pn.endsWith('.ao') ? pn : null, tags: t, resist: tm?.resist[n.name] ?? 'Normal', ...withNameHeuristic(n.name, layerOf(t, tm?.resist[n.name])), mesh: m })
    }
  }
  return { meshes, tagSource: tags ? 'cssc' : 'none', parts: [...parts.values()] }
}
