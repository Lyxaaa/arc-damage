// Copies extracted glbs from data/raw/arcs into web/public/arcs and writes index.json (code, name, meshes).
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'

const src = 'data/raw/arcs'
const dst = 'web/public/arcs'
rmSync(dst, { recursive: true, force: true })
mkdirSync(dst, { recursive: true })
const index = []
for (const code of readdirSync(src)) {
  const { name } = JSON.parse(readFileSync(`${src}/${code}/arc.json`, 'utf8'))
  const meshes = readdirSync(`${src}/${code}`).filter((f) => f.endsWith('.glb'))
  mkdirSync(`${dst}/${code}`)
  for (const m of meshes) cpSync(`${src}/${code}/${m}`, `${dst}/${code}/${m}`)
  index.push({ code, name, meshes })
}
index.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(`${dst}/index.json`, JSON.stringify(index, null, 1))
console.log(`published ${index.length} arcs`)
