// Sanity-checks published ARC data: every ARC has a glb + parts.json, parts are unique,
// parents exist, and HP coverage is reported. Usage: node scripts/validate.mjs [arcsDir]
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = process.argv[2] ?? join(root, 'web/public/arcs')
const errors = []
const notes = []
const arcs = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
if (arcs.length !== 25) errors.push(`expected 25 ARCs, found ${arcs.length}`)

for (const arc of arcs) {
  const pf = join(dir, arc, 'parts.json')
  if (!existsSync(pf)) { errors.push(`${arc}: missing parts.json`); continue }
  const { meshes, parts } = JSON.parse(readFileSync(pf, 'utf8'))
  for (const m of meshes) if (!existsSync(join(dir, arc, m))) errors.push(`${arc}: missing mesh ${m}`)
  const bones = new Set()
  for (const p of parts) {
    if (bones.has(p.bone)) errors.push(`${arc}: duplicate bone ${p.bone}`)
    bones.add(p.bone)
  }
  for (const p of parts) if (p.parent && !bones.has(p.parent)) errors.push(`${arc}: ${p.bone} has unknown parent ${p.parent}`)
  const noHp = parts.filter((p) => p.hp == null).length
  if (noHp) notes.push(`${arc}: ${noHp}/${parts.length} parts without HP`)
}
for (const n of notes) console.log('note', n)
for (const e of errors) console.error('ERROR', e)
console.log(`${arcs.length} ARCs checked, ${errors.length} errors`)
process.exit(errors.length ? 1 : 0)
