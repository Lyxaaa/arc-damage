// Resolves part HP from DA_Balancing_C_* AttributeData by evaluating GameplayTagQuery token streams.
import { readFileSync, readdirSync } from 'node:fs'

const strip = (t) => t.replace(/^Part\.Decorator\./, '')
const has = (tags, q) => tags.some((t) => t === q || t.startsWith(q + '.'))

/** Token stream: [version, hasRoot, expr...]; tag expr = type,n,idx*n (1 any, 2 all, 3 none); expr-of-exprs = type,n,expr*n (4 any, 5 all, 6 none). */
export function evalQuery(q, partTags) {
  const s = q.QueryTokenStream
  const dict = q.TagDictionary.map((d) => strip(d.TagName))
  const tags = partTags.map(strip)
  if (!s?.length || !s[1]) return false
  let p = 2
  const read = () => {
    const type = s[p++]
    const n = s[p++]
    if (type <= 3) {
      const m = Array.from({ length: n }, () => has(tags, dict[s[p++]]))
      return type === 1 ? m.some(Boolean) : type === 2 ? m.every(Boolean) : !m.some(Boolean)
    }
    const m = Array.from({ length: n }, read)
    return type === 4 ? m.some(Boolean) : type === 5 ? m.every(Boolean) : !m.some(Boolean)
  }
  return read()
}

export function loadBalancing(dir) {
  const f = readdirSync(dir).find((x) => /^DA_Balancing_.*\.json$/.test(x))
  if (!f) return null
  const e = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).find((x) => x.Properties?.AttributeData)
  return e.Properties
}

export function resolveHp(bal, tags) {
  if (!bal) return null
  const hit = bal.AttributeData.find((a) => evalQuery(a.IdentifierQuery, tags))
  return hit ? { hp: hit.Health, hpQuery: hit.IdentifierQueryName.trim() } : null
}

export function damageOf(bal, tags) {
  return (bal?.DamageData ?? []).filter((a) => evalQuery(a.IdentifierQuery, tags)).map((a) => ({ type: String(a.DamageType).split('::')[1], damage: a.Damage }))
}
