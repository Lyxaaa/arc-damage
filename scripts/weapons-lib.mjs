// Resolve weapon stats from raw item dumps, following the blueprint Super chain.
import fs from 'node:fs'
import path from 'node:path'

const ITEMS = 'data/raw/items'

// "/Game/Pioneer/Items/X/Y.0" -> raw json path
const rawPath = (objPath) =>
  path.join(ITEMS, objPath.replace('/Game/Pioneer/', '').replace(/\.\d+$/, '') + '.json')

const cache = new Map()
const load = (p) => {
  if (!cache.has(p)) cache.set(p, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)
  return cache.get(p)
}

// Merged CDO properties, child overriding parent.
export function resolveProps(file, depth = 0) {
  const d = load(file)
  if (!d || depth > 8) return {}
  const cls = d.find((e) => e.Type === 'BlueprintGeneratedClass')
  const cdo = d.find((e) => e.Name?.startsWith('Default__'))
  const superPath = cls?.Super?.ObjectPath
  const base = superPath ? resolveProps(rawPath(superPath), depth + 1) : {}
  return { ...base, ...(cdo?.Properties ?? {}) }
}

export const chain = (file) => {
  const out = []
  for (let f = file, i = 0; f && i < 8; i++) {
    out.push(path.basename(f, '.json'))
    const cls = load(f)?.find((e) => e.Type === 'BlueprintGeneratedClass')
    f = cls?.Super?.ObjectPath ? rawPath(cls.Super.ObjectPath) : null
  }
  return out
}
